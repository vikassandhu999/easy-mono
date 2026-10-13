import XCTest

final class AuthenticationTests: XCTestCase {
    @MainActor
    func testLauncherEntry() throws {
        continueAfterFailure = false
        let app = XCUIApplication(bundleIdentifier: "com.easy.client")
        app.terminate()
        XCUIDevice.shared.press(.home)
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        let icon = springboard.icons["Easy"].firstMatch
        for _ in 0..<5 {
            if icon.exists && icon.isHittable { break }
            springboard.swipeLeft()
        }
        XCTAssertTrue(icon.exists && icon.isHittable, "Easy is available from the launcher")
        let launcher = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        launcher.name = "iPhone Easy launcher icon"
        launcher.lifetime = .keepAlways
        add(launcher)
        icon.tap()
        XCTAssertTrue(app.webViews.firstMatch.waitForExistence(timeout: 15), app.debugDescription)
        XCTAssertTrue(app.buttons["Continue with email"].waitForExistence(timeout: 10) || app.links["Your account"].exists)
        let opened = XCTAttachment(screenshot: app.screenshot())
        opened.name = "iPhone launcher entry"
        opened.lifetime = .keepAlways
        add(opened)
    }

    @MainActor
    func testMigratedSessionAndSignOut() throws {
        continueAfterFailure = false
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "fixture", withExtension: "json"))
        let fixture = try JSONDecoder().decode(Fixture.self, from: Data(contentsOf: url))
        guard fixture.credentialMigration == true else {
            throw XCTSkip("Run ios-credential-fixture.mjs before the isolated migration test")
        }
        let app = XCUIApplication(bundleIdentifier: "com.easy.client")
        app.launch()
        app.open(try XCTUnwrap(URL(string: "easy://app/account/details")))
        XCTAssertTrue(app.staticTexts[fixture.migrationEmail].waitForExistence(timeout: 15), app.debugDescription)
        app.terminate()
        app.launch()
        app.open(try XCTUnwrap(URL(string: "easy://app/account/details")))
        XCTAssertTrue(app.staticTexts[fixture.migrationEmail].waitForExistence(timeout: 15), app.debugDescription)
        let migrated = XCTAttachment(screenshot: app.screenshot())
        migrated.name = "iPhone migrated credential session after restart"
        migrated.lifetime = .keepAlways
        add(migrated)
        app.links["Back"].tap()
        if !app.buttons["Sign out"].isHittable { app.swipeUp() }
        app.buttons["Sign out"].tap()
        XCTAssertTrue(app.buttons["Continue with email"].waitForExistence(timeout: 15))
        app.terminate()
        app.launch()
        XCTAssertTrue(app.buttons["Continue with email"].waitForExistence(timeout: 15))
    }

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
        let keyboard = app.keyboards.firstMatch
        XCTAssertTrue(keyboard.waitForExistence(timeout: 5))
        XCTAssertGreaterThan(keyboard.frame.height, 150)
        XCTAssertLessThan(keyboard.frame.minY, app.frame.maxY - 100, "Software keyboard is visible on screen")
        let verify = app.buttons["Verify and continue"]
        XCTAssertTrue(verify.isHittable)
        XCTAssertLessThanOrEqual(verify.frame.maxY, keyboard.frame.minY + 2, "Verify stays above the keyboard")
        let codeScreen = XCTAttachment(screenshot: app.screenshot())
        codeScreen.name = "iPhone verification above keyboard"
        codeScreen.lifetime = .keepAlways
        add(codeScreen)
        verify.tap()
        let account = app.links["Your account"]
        XCTAssertTrue(account.waitForExistence(timeout: 15), app.debugDescription)
        account.tap()
        app.links["Personal details"].tap()
        let fullName = app.webViews.textFields["Full name"]
        XCTAssertTrue(fullName.waitForExistence(timeout: 15), app.debugDescription)
        fullName.tap()
        fullName.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: (fullName.value as? String)?.count ?? 0))
        fullName.typeText("Native saved client")
        app.terminate()
        app.launch()
        XCTAssertTrue(account.waitForExistence(timeout: 15))
        account.tap()
        app.links["Personal details"].tap()
        XCTAssertTrue(fullName.waitForExistence(timeout: 15))
        XCTAssertEqual(fullName.value as? String, "Native saved client", "Draft survives process restart")
        XCTAssertTrue(app.staticTexts["Your unsaved details were restored."].waitForExistence(timeout: 10))
        fullName.tap()
        let save = app.buttons["Save details"]
        if !save.isHittable { app.swipeUp() }
        XCTAssertTrue(save.isHittable, "Save must remain reachable with the keyboard open")
        let detailsKeyboard = app.keyboards.firstMatch
        XCTAssertTrue(detailsKeyboard.waitForExistence(timeout: 10))
        XCTAssertGreaterThan(detailsKeyboard.frame.height, 150)
        XCTAssertLessThan(detailsKeyboard.frame.minY, app.frame.maxY - 100)
        XCTAssertLessThanOrEqual(save.frame.maxY, detailsKeyboard.frame.minY + 2)
        let beforeSave = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        beforeSave.name = "iPhone details save above visible keyboard"
        beforeSave.lifetime = .keepAlways
        add(beforeSave)
        save.tap()
        XCTAssertTrue(app.staticTexts["Your details are saved."].waitForExistence(timeout: 15), app.debugDescription)
        let saved = XCTAttachment(screenshot: app.screenshot())
        saved.name = "iPhone saved profile"
        saved.lifetime = .keepAlways
        add(saved)
        XCUIDevice.shared.press(.home)
        app.activate()
        XCTAssertTrue(fullName.waitForExistence(timeout: 10))
        app.terminate()
        app.launch()
        XCTAssertTrue(app.links["Your account"].waitForExistence(timeout: 15), "Session survives process restart")
        app.links["Your account"].tap()
        app.links["Personal details"].tap()
        XCTAssertTrue(fullName.waitForExistence(timeout: 15))
        XCTAssertEqual(fullName.value as? String, "Native saved client")
        app.links["Back"].tap()
        app.buttons["Sign out"].tap()
        XCTAssertTrue(app.buttons["Continue with email"].waitForExistence(timeout: 10))
        app.terminate()
        app.launch()
        XCTAssertTrue(app.buttons["Continue with email"].waitForExistence(timeout: 10), "Logout survives restart")
    }

    @MainActor
    func testMessageDraftPhotoAndSavedResult() throws {
        continueAfterFailure = false
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "fixture", withExtension: "json"))
        let fixture = try JSONDecoder().decode(Fixture.self, from: Data(contentsOf: url))
        let app = XCUIApplication(bundleIdentifier: "com.easy.client")
        let system = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        let allow = system.buttons["Allow Full Access"]
        if allow.exists { allow.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap() }
        app.terminate()
        app.resetAuthorizationStatus(for: .photos)
        app.launch()
        app.open(try XCTUnwrap(URL(string: "easy://app/invite/\(fixture.messageToken)")))
        let signOut = app.buttons["Sign out to continue"]
        if signOut.waitForExistence(timeout: 2) { signOut.tap() }
        XCTAssertTrue(app.buttons["Continue with email"].waitForExistence(timeout: 15))
        app.buttons["Continue with email"].tap()
        let code = app.webViews.textFields["Verification code"]
        XCTAssertTrue(code.waitForExistence(timeout: 15))
        code.tap()
        code.typeText("123456")
        app.buttons["Verify and continue"].tap()
        XCTAssertTrue(app.links["Your account"].waitForExistence(timeout: 15))
        let messageURL = try XCTUnwrap(URL(string: "easy://app/messages"))
        app.open(messageURL)
        let input = app.webViews.textViews["Message your coach"]
        XCTAssertTrue(input.waitForExistence(timeout: 15), app.debugDescription)
        XCTAssertFalse(app.buttons["Send"].isEnabled, "An empty composer has nothing to send")
        input.tap()
        input.typeText("My iPhone message survives a restart")
        XCTAssertEqual(input.value as? String, "My iPhone message survives a restart")
        XCTAssertTrue(app.staticTexts["Draft saved on this device."].waitForExistence(timeout: 10))
        XCTAssertTrue(app.buttons["Send"].isHittable, app.debugDescription)
        let keyboard = XCTAttachment(screenshot: app.screenshot())
        keyboard.name = "iPhone message keyboard"
        keyboard.lifetime = .keepAlways
        add(keyboard)
        app.terminate()
        app.launch()
        app.open(messageURL)
        XCTAssertTrue(input.waitForExistence(timeout: 15))
        XCTAssertEqual(input.value as? String, "My iPhone message survives a restart")
        app.buttons["Attach"].tap()
        app.buttons["Choose photo"].tap()
        XCTAssertTrue(allow.waitForExistence(timeout: 10), system.debugDescription)
        allow.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
        let image = app.scrollViews.buttons.firstMatch
        XCTAssertTrue(image.waitForExistence(timeout: 10), app.debugDescription)
        image.tap()
        app.buttons["Done"].tap()
        XCTAssertTrue(app.buttons["Remove attachment 1"].waitForExistence(timeout: 15), app.debugDescription)
        XCTAssertTrue(app.staticTexts["Draft saved on this device."].waitForExistence(timeout: 10))
        app.terminate()
        app.launch()
        app.open(messageURL)
        XCTAssertTrue(app.buttons["Remove attachment 1"].waitForExistence(timeout: 15))
        XCTAssertEqual(input.value as? String, "My iPhone message survives a restart")
        input.tap()
        input.typeText(" ")
        input.typeText(XCUIKeyboardKey.delete.rawValue)
        XCTAssertEqual(input.value as? String, "My iPhone message survives a restart")
        let visibleKeyboard = app.keyboards.firstMatch
        XCTAssertTrue(visibleKeyboard.waitForExistence(timeout: 10))
        XCTAssertGreaterThan(visibleKeyboard.frame.height, 150)
        XCTAssertLessThan(visibleKeyboard.frame.minY, app.frame.maxY - 100)
        XCTAssertLessThanOrEqual(app.buttons["Send"].frame.maxY, visibleKeyboard.frame.minY + 2)
        let beforeSend = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        beforeSend.name = "iPhone message send above visible keyboard"
        beforeSend.lifetime = .keepAlways
        add(beforeSend)
        app.buttons["Send"].tap()
        XCTAssertTrue(app.staticTexts["Message sent."].waitForExistence(timeout: 20), app.debugDescription)
        XCTAssertTrue(app.buttons["Open photo"].waitForExistence(timeout: 15))
        app.buttons["Open photo"].tap()
        XCTAssertTrue(app.images["Shared in this conversation"].waitForExistence(timeout: 15), app.debugDescription)
        XCUIDevice.shared.press(.home)
        app.activate()
        XCTAssertTrue(app.staticTexts["1 message"].waitForExistence(timeout: 15), app.debugDescription)
        app.terminate()
        app.launch()
        app.open(messageURL)
        XCTAssertTrue(app.staticTexts["1 message"].waitForExistence(timeout: 15), app.debugDescription)
        // WebKit exposes the placeholder as the accessibility value of an empty textarea.
        XCTAssertEqual(input.value as? String, "Write a message…")
        app.buttons["Open photo"].tap()
        XCTAssertTrue(app.images["Shared in this conversation"].waitForExistence(timeout: 15), app.debugDescription)
        let saved = XCTAttachment(screenshot: app.screenshot())
        saved.name = "iPhone saved message and attachment"
        saved.lifetime = .keepAlways
        add(saved)
        for name in ["clip", "note"] {
            if app.buttons["Attach"].exists { app.buttons["Attach"].tap() }
            app.buttons["Video or audio"].tap()
            let choose = app.buttons["Choose File"]
            XCTAssertTrue(choose.waitForExistence(timeout: 10), app.debugDescription)
            choose.tap()
            let browse = app.buttons["Browse"].firstMatch
            if browse.waitForExistence(timeout: 2) { browse.tap() }
            let local = app.staticTexts["On My iPhone"].firstMatch
            if local.waitForExistence(timeout: 2) { local.tap() }
            let file = app.cells.matching(NSPredicate(format: "label CONTAINS %@", name)).firstMatch
            XCTAssertTrue(file.waitForExistence(timeout: 10), app.debugDescription)
            file.tap()
            XCTAssertTrue(app.staticTexts["Draft saved on this device."].waitForExistence(timeout: 10), app.debugDescription)
        }
        XCTAssertTrue(app.buttons["Remove attachment 2"].waitForExistence(timeout: 15), app.debugDescription)
        app.terminate()
        app.launch()
        app.open(messageURL)
        XCTAssertTrue(app.buttons["Remove attachment 2"].waitForExistence(timeout: 15), app.debugDescription)
        app.buttons["Send"].tap()
        XCTAssertTrue(app.staticTexts["Message sent."].waitForExistence(timeout: 20), app.debugDescription)
        XCTAssertTrue(app.buttons["Open video"].waitForExistence(timeout: 15), app.debugDescription)
        app.buttons["Open video"].tap()
        // The one-second fixtures must advance after a physical tap, not merely load.
        let video = app.otherElements.matching(NSPredicate(format: "label == %@", "1 seconds")).firstMatch
        XCTAssertTrue(video.waitForExistence(timeout: 15), app.debugDescription)
        XCTAssertEqual(video.value as? String, "0 seconds")
        video.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
        let playingVideo = XCTAttachment(screenshot: app.screenshot())
        playingVideo.name = "iPhone message video playing"
        playingVideo.lifetime = .keepAlways
        add(playingVideo)
        let videoFinished = XCTNSPredicateExpectation(
            predicate: NSPredicate(format: "value == %@", "1 seconds"), object: video
        )
        XCTAssertEqual(XCTWaiter.wait(for: [videoFinished], timeout: 10), .completed, app.debugDescription)
        app.buttons["Close video"].tap()
        XCTAssertTrue(app.buttons["Open audio"].waitForExistence(timeout: 15), app.debugDescription)
        app.buttons["Open audio"].tap()
        let audio = app.otherElements["Audio Controls"].firstMatch
        XCTAssertTrue(audio.waitForExistence(timeout: 15), app.debugDescription)
        XCTAssertTrue(app.staticTexts["Elapsed: 0 seconds"].exists)
        // WebKit's Play accessibility frame extends outside the audio control.
        // Tap the visible control's leading play icon instead.
        audio.coordinate(withNormalizedOffset: CGVector(dx: 0.07, dy: 0.5)).tap()
        XCTAssertTrue(app.staticTexts["Elapsed: 1 second"].waitForExistence(timeout: 10), app.debugDescription)
        XCTAssertTrue(app.staticTexts["2 messages"].waitForExistence(timeout: 15), app.debugDescription)
        let media = XCTAttachment(screenshot: app.screenshot())
        media.name = "iPhone message audio played to completion"
        media.lifetime = .keepAlways
        add(media)
    }

    struct Fixture: Decodable {
        let email: String
        let token: String
        let messageToken: String
        let migrationToken: String
        let migrationEmail: String
        let credentialMigration: Bool?
    }
}
