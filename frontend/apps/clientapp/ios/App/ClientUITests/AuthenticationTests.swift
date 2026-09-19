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

    struct Fixture: Decodable { let email: String; let token: String }
}
