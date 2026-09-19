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
    func testFormDraftAndSavedResponse() throws {
        continueAfterFailure = false
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "fixture", withExtension: "json"))
        let fixture = try JSONDecoder().decode(Fixture.self, from: Data(contentsOf: url))
        let app = XCUIApplication(bundleIdentifier: "com.easy.client")
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
        // This case exercises the simulator's denied photo-access state.
        let denied = app.alerts["Easy"]
        XCTAssertTrue(denied.waitForExistence(timeout: 10), app.debugDescription)
        XCTAssertTrue(denied.buttons["Settings"].exists)
        denied.buttons["OK"].tap()
        XCTAssertTrue(app.staticTexts["Photo access is off. Enable it for Easy in your device settings, then try again. You can keep answering the form."].waitForExistence(timeout: 10))
        XCTAssertTrue(goal.waitForExistence(timeout: 10))
        app.terminate()
        app.launch()
        XCTAssertTrue(app.links["Forms & check-ins"].waitForExistence(timeout: 15))
        app.open(try XCTUnwrap(URL(string: "easy://app/forms/\(fixture.assignmentId)")))
        XCTAssertTrue(goal.waitForExistence(timeout: 15), app.debugDescription)
        XCTAssertEqual(goal.value as? String, "A steady native routine")
        XCTAssertTrue(app.staticTexts["Your unsent answers were restored."].waitForExistence(timeout: 10))
        let send = app.buttons["Send response"]
        if !send.isHittable { app.swipeUp() }
        send.tap()
        XCTAssertTrue(app.staticTexts["A steady native routine"].waitForExistence(timeout: 15), app.debugDescription)
        XCTAssertTrue(app.links["Back to your forms"].exists)
        let saved = XCTAttachment(screenshot: app.screenshot())
        saved.name = "iPhone saved form"
        saved.lifetime = .keepAlways
        add(saved)
        app.terminate()
        app.launch()
        XCTAssertTrue(app.links["Forms & check-ins"].waitForExistence(timeout: 15))
        app.open(try XCTUnwrap(URL(string: "easy://app/forms/\(fixture.assignmentId)")))
        XCTAssertTrue(app.staticTexts["A steady native routine"].waitForExistence(timeout: 15))
        app.links["Your account"].tap()
        XCTAssertTrue(app.buttons["Sign out"].waitForExistence(timeout: 15))
        app.buttons["Sign out"].tap()
        XCTAssertTrue(app.buttons["Continue with email"].waitForExistence(timeout: 10))
    }

    struct Fixture: Decodable {
        let email: String
        let token: String
        let formToken: String
        let formEmail: String
        let assignmentId: String
    }
}
