import XCTest

final class AuthenticationTests: XCTestCase {
    @MainActor
    func testInvitationProfileAndRestart() throws {
        continueAfterFailure = false
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "fixture", withExtension: "json"))
        let fixture = try JSONDecoder().decode(Fixture.self, from: Data(contentsOf: url))
        let app = XCUIApplication(bundleIdentifier: "com.easy.client")
        app.launch()
        app.open(try XCTUnwrap(URL(string: "easy://app/invite/\(fixture.token)")))
        let signOut = app.buttons["Sign out to continue"]
        if signOut.waitForExistence(timeout: 2) { signOut.tap() }
        let email = app.webViews.textFields["Email"]
        XCTAssertTrue(email.waitForExistence(timeout: 15), app.debugDescription)
        XCTAssertEqual(email.value as? String, fixture.email)
        app.buttons["Continue with email"].tap()
        let code = app.webViews.textFields["Verification code"]
        XCTAssertTrue(code.waitForExistence(timeout: 15), app.debugDescription)
        code.tap()
        code.typeText("123456")
        app.buttons["Verify and continue"].tap()
        let account = app.links["Your account"]
        XCTAssertTrue(account.waitForExistence(timeout: 15), app.debugDescription)
        account.tap()
        let firstName = app.webViews.textFields["First name"]
        XCTAssertTrue(firstName.waitForExistence(timeout: 15), app.debugDescription)
        firstName.tap()
        firstName.typeText("Native saved client")
        app.terminate()
        app.launch()
        XCTAssertTrue(account.waitForExistence(timeout: 15))
        account.tap()
        XCTAssertTrue(firstName.waitForExistence(timeout: 15))
        XCTAssertEqual(firstName.value as? String, "Native saved client", "Draft survives process restart")
        XCTAssertTrue(app.staticTexts["Your unsaved details were restored."].waitForExistence(timeout: 10))
        firstName.tap()
        let save = app.buttons["Save details"]
        if !save.isHittable { app.swipeUp() }
        XCTAssertTrue(save.isHittable, "Save must remain reachable with the keyboard open")
        save.tap()
        XCTAssertTrue(app.staticTexts["Your details are saved."].waitForExistence(timeout: 15), app.debugDescription)
        let saved = XCTAttachment(screenshot: app.screenshot())
        saved.name = "iPhone saved profile"
        saved.lifetime = .keepAlways
        add(saved)
        XCUIDevice.shared.press(.home)
        app.activate()
        XCTAssertTrue(app.links["Your account"].waitForExistence(timeout: 10))
        app.terminate()
        app.launch()
        XCTAssertTrue(app.links["Your account"].waitForExistence(timeout: 15), "Session survives process restart")
        app.links["Your account"].tap()
        XCTAssertTrue(firstName.waitForExistence(timeout: 15))
        XCTAssertEqual(firstName.value as? String, "Native saved client")
        app.buttons["Sign out"].tap()
        XCTAssertTrue(app.buttons["Continue with email"].waitForExistence(timeout: 10))
        app.terminate()
        app.launch()
        XCTAssertTrue(app.buttons["Continue with email"].waitForExistence(timeout: 10), "Logout survives restart")
    }

    @MainActor
    func testFormDraftAndSavedResponse() async throws {
        continueAfterFailure = false
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "fixture", withExtension: "json"))
        let fixture = try JSONDecoder().decode(Fixture.self, from: Data(contentsOf: url))
        let app = XCUIApplication(bundleIdentifier: "com.easy.client")
        app.resetAuthorizationStatus(for: .photos)
        app.launch()
        app.open(try XCTUnwrap(URL(string: "easy://app/invite/\(fixture.formToken)")))
        let signOut = app.buttons["Sign out to continue"]
        if signOut.waitForExistence(timeout: 2) { signOut.tap() }
        XCTAssertTrue(app.buttons["Continue with email"].waitForExistence(timeout: 15), app.debugDescription)
        app.buttons["Continue with email"].tap()
        let code = app.webViews.textFields["Verification code"]
        XCTAssertTrue(code.waitForExistence(timeout: 15), app.debugDescription)
        code.tap()
        code.typeText("123456")
        app.buttons["Verify and continue"].tap()
        XCTAssertTrue(app.links["Forms & check-ins"].waitForExistence(timeout: 15), app.debugDescription)
        app.open(try XCTUnwrap(URL(string: "easy://app/forms/\(fixture.assignmentId)")))
        let goal = app.webViews.textViews.matching(NSPredicate(format: "label CONTAINS %@", "Your goal")).firstMatch
        XCTAssertTrue(goal.waitForExistence(timeout: 15), app.debugDescription)
        goal.tap()
        goal.typeText("A steady native routine")
        let choose = app.buttons["Choose photo"]
        if !choose.isHittable { app.swipeUp() }
        choose.tap()
        let system = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        let refuse = system.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Don")).firstMatch
        XCTAssertTrue(refuse.waitForExistence(timeout: 10), system.debugDescription)
        refuse.tap()
        let denied = app.alerts["Easy"]
        XCTAssertTrue(denied.waitForExistence(timeout: 10), app.debugDescription)
        XCTAssertTrue(denied.buttons["Settings"].exists)
        denied.buttons["OK"].tap()
        XCTAssertTrue(app.staticTexts["Photo access is off. Enable it for Easy in your device settings, then try again. You can keep answering the form."].waitForExistence(timeout: 10))
        XCTAssertTrue(goal.waitForExistence(timeout: 10))
        if let control = fixture.apiControlURL { try await setConnection(control, available: false) }
        app.terminate()
        app.launch()
        XCTAssertTrue(app.links["Forms & check-ins"].waitForExistence(timeout: 15))
        app.open(try XCTUnwrap(URL(string: "easy://app/forms/\(fixture.assignmentId)")))
        XCTAssertTrue(goal.waitForExistence(timeout: 15), app.debugDescription)
        XCTAssertEqual(goal.value as? String, "A steady native routine")
        XCTAssertTrue(app.staticTexts["Your unsent answers were restored."].waitForExistence(timeout: 10))
        let send = app.buttons["Send response"]
        if let control = fixture.apiControlURL {
            let stale = app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "The latest version could not be checked.")).firstMatch
            XCTAssertTrue(stale.waitForExistence(timeout: 15), app.debugDescription)
            XCTAssertFalse(send.isEnabled, "A cached form cannot be sent until its server state is checked")
            let offline = XCTAttachment(screenshot: app.screenshot())
            offline.name = "iPhone cached form during API interruption"
            offline.lifetime = .keepAlways
            add(offline)
            try await setConnection(control, available: true)
            let refresh = app.buttons["Check for updates"]
            if !refresh.isHittable { app.swipeDown() }
            refresh.tap()
            let ready = XCTNSPredicateExpectation(predicate: NSPredicate(format: "enabled == true"), object: send)
            await fulfillment(of: [ready], timeout: 15)
        }
        if !send.isHittable { app.swipeUp() }
        send.tap()
        XCTAssertTrue(app.staticTexts["A steady native routine"].waitForExistence(timeout: 15), app.debugDescription)
        XCTAssertTrue(app.links["Back to your forms"].exists)
        let saved = XCTAttachment(screenshot: app.screenshot())
        saved.name = "iPhone saved form"
        saved.lifetime = .keepAlways
        add(saved)
        if let control = fixture.apiControlURL { try await setConnection(control, available: false) }
        app.terminate()
        app.launch()
        XCTAssertTrue(app.links["Forms & check-ins"].waitForExistence(timeout: 15))
        app.open(try XCTUnwrap(URL(string: "easy://app/forms/\(fixture.assignmentId)")))
        XCTAssertTrue(app.staticTexts["A steady native routine"].waitForExistence(timeout: 15))
        if let control = fixture.apiControlURL { try await setConnection(control, available: true) }
        app.links["Your account"].tap()
        XCTAssertTrue(app.buttons["Sign out"].waitForExistence(timeout: 15))
        app.buttons["Sign out"].tap()
        XCTAssertTrue(app.buttons["Continue with email"].waitForExistence(timeout: 10))
    }

    private func setConnection(_ control: String, available: Bool) async throws {
        let url = try XCTUnwrap(URL(string: "\(control)?available=\(available)"))
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        let (_, response) = try await URLSession.shared.data(for: request)
        XCTAssertEqual((response as? HTTPURLResponse)?.statusCode, 200)
    }

    @MainActor
    func testPhotoSelectionAndSubmission() throws {
        continueAfterFailure = false
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "fixture", withExtension: "json"))
        let fixture = try JSONDecoder().decode(Fixture.self, from: Data(contentsOf: url))
        let app = XCUIApplication(bundleIdentifier: "com.easy.client")
        app.resetAuthorizationStatus(for: .photos)
        app.launch()
        app.open(try XCTUnwrap(URL(string: "easy://app/invite/\(fixture.photoToken)")))
        let signOut = app.buttons["Sign out to continue"]
        if signOut.waitForExistence(timeout: 2) { signOut.tap() }
        XCTAssertTrue(app.buttons["Continue with email"].waitForExistence(timeout: 15))
        app.buttons["Continue with email"].tap()
        let code = app.webViews.textFields["Verification code"]
        XCTAssertTrue(code.waitForExistence(timeout: 15))
        code.tap()
        code.typeText("123456")
        app.buttons["Verify and continue"].tap()
        XCTAssertTrue(app.links["Forms & check-ins"].waitForExistence(timeout: 15))
        app.open(try XCTUnwrap(URL(string: "easy://app/forms/\(fixture.photoAssignmentId)")))
        let choose = app.buttons["Choose photo"]
        XCTAssertTrue(choose.waitForExistence(timeout: 15))
        choose.tap()
        let system = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        if fixture.photoAccess == "limited" {
            let limit = system.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Limit Access")).firstMatch
            XCTAssertTrue(limit.waitForExistence(timeout: 10), system.debugDescription)
            limit.tap()
            let library = XCUIApplication(bundleIdentifier: "com.apple.mobileslideshow.photospicker")
            let photo = library.images.matching(NSPredicate(format: "label BEGINSWITH %@", "Photo,")).firstMatch
            XCTAssertTrue(photo.waitForExistence(timeout: 25), library.debugDescription)
            // PhotosPicker exposes image bounds but no accessibility hit point.
            photo.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
            library.buttons["Done"].coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
        } else {
            let allow = system.buttons["Allow Full Access"]
            XCTAssertTrue(allow.waitForExistence(timeout: 10), system.debugDescription)
            allow.tap()
        }
        let image = app.scrollViews.buttons.firstMatch
        XCTAssertTrue(image.waitForExistence(timeout: 10), app.debugDescription)
        if fixture.photoAccess == "limited" {
            XCTAssertEqual(app.scrollViews.buttons.count, 1, "Only the permitted photo appears in Easy's library")
        }
        image.tap()
        app.buttons["Done"].tap()
        XCTAssertTrue(app.staticTexts["Photo uploaded"].waitForExistence(timeout: 20), app.debugDescription)
        let send = app.buttons["Send response"]
        if !send.isHittable { app.swipeUp() }
        send.tap()
        let savedPhoto = app.links.matching(NSPredicate(format: "label CONTAINS %@", "Open photo 1")).firstMatch
        XCTAssertTrue(savedPhoto.waitForExistence(timeout: 15), app.debugDescription)
        app.terminate()
        app.launch()
        XCTAssertTrue(app.links["Forms & check-ins"].waitForExistence(timeout: 15))
        app.open(try XCTUnwrap(URL(string: "easy://app/forms/\(fixture.photoAssignmentId)")))
        XCTAssertTrue(savedPhoto.waitForExistence(timeout: 15), app.debugDescription)
        let saved = XCTAttachment(screenshot: app.screenshot())
        saved.name = "iPhone saved progress photo (\(fixture.photoAccess ?? "full") access)"
        saved.lifetime = .keepAlways
        add(saved)
    }

    struct Fixture: Decodable {
        let email: String
        let token: String
        let formToken: String
        let formEmail: String
        let assignmentId: String
        let apiControlURL: String?
        let photoAccess: String?
        let photoToken: String
        let photoAssignmentId: String
    }
}
