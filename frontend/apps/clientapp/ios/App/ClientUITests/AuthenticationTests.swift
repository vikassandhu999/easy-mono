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
        app.links["Personal details"].tap()
        let firstName = app.webViews.textFields["First name"]
        XCTAssertTrue(firstName.waitForExistence(timeout: 15), app.debugDescription)
        firstName.tap()
        firstName.typeText("Native saved client")
        app.terminate()
        app.launch()
        XCTAssertTrue(account.waitForExistence(timeout: 15))
        account.tap()
        app.links["Personal details"].tap()
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
        XCTAssertTrue(firstName.waitForExistence(timeout: 10))
        app.terminate()
        app.launch()
        XCTAssertTrue(app.links["Your account"].waitForExistence(timeout: 15), "Session survives process restart")
        app.links["Your account"].tap()
        app.links["Personal details"].tap()
        XCTAssertTrue(firstName.waitForExistence(timeout: 15))
        XCTAssertEqual(firstName.value as? String, "Native saved client")
        app.links["Back"].tap()
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
        app.resetAuthorizationStatus(for: .camera)
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
        let system = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        for action in ["Take photo", "Choose photo"] {
            let choose = app.buttons[action]
            if !choose.isHittable { app.swipeUp() }
            choose.tap()
            let refuse = system.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Don")).firstMatch
            XCTAssertTrue(refuse.waitForExistence(timeout: 10), system.debugDescription)
            refuse.tap()
            let denied = app.alerts["Easy"]
            XCTAssertTrue(denied.waitForExistence(timeout: 10), app.debugDescription)
            XCTAssertTrue(denied.buttons["Settings"].exists)
            denied.buttons["OK"].tap()
            XCTAssertTrue(app.staticTexts["Photo access is off. Enable it for Easy in your device settings, then try again. Your draft stays here."].waitForExistence(timeout: 10))
        }
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

    @MainActor
    func testWorkoutDraftAndSavedResult() throws {
        continueAfterFailure = false
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "fixture", withExtension: "json"))
        let fixture = try JSONDecoder().decode(Fixture.self, from: Data(contentsOf: url))
        let app = XCUIApplication(bundleIdentifier: "com.easy.client")
        app.launch()
        app.open(try XCTUnwrap(URL(string: "easy://app/invite/\(fixture.token)")))
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
        app.open(try XCTUnwrap(URL(string: "easy://app/training")))
        let start = app.buttons["Start freestyle workout"]
        XCTAssertTrue(start.waitForExistence(timeout: 15), app.debugDescription)
        app.swipeUp()
        start.tap()
        let exercise = app.webViews.textFields["Exercise name"]
        XCTAssertTrue(exercise.waitForExistence(timeout: 15))
        exercise.tap()
        exercise.typeText("iPhone squat")
        let reps = app.webViews.textFields["Reps"]
        let web = app.webViews.firstMatch
        web.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.4)).press(
            forDuration: 0.05,
            thenDragTo: web.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.15))
        )
        reps.tap()
        reps.typeText("8")
        XCTAssertTrue(app.staticTexts["Draft saved on this device."].waitForExistence(timeout: 10))
        let keyboard = XCTAttachment(screenshot: app.screenshot())
        keyboard.name = "iPhone workout keyboard"
        keyboard.lifetime = .keepAlways
        add(keyboard)
        app.terminate()
        app.launch()
        let resume = app.links["Resume workout"]
        XCTAssertTrue(resume.waitForExistence(timeout: 15), app.debugDescription)
        resume.tap()
        XCTAssertTrue(reps.waitForExistence(timeout: 15))
        XCTAssertEqual(reps.value as? String, "8")
        XCTAssertEqual(exercise.value as? String, "iPhone squat")
        reps.tap()
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5))
        let save = app.buttons["Save set"]
        XCTAssertGreaterThan(app.keyboards.firstMatch.frame.height, 150)
        XCTAssertLessThan(app.keyboards.firstMatch.frame.minY, app.frame.maxY - 150)
        XCTAssertTrue(save.isHittable, "Set save remains reachable above the keyboard")
        XCTAssertLessThanOrEqual(save.frame.maxY, app.keyboards.firstMatch.frame.minY, "Save must be above the native keyboard")
        let beforeSave = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        beforeSave.name = "iPhone workout save above keyboard"
        beforeSave.lifetime = .keepAlways
        add(beforeSave)
        save.tap()
        XCTAssertTrue(app.staticTexts["Set saved."].waitForExistence(timeout: 15), app.debugDescription)
        XCUIDevice.shared.press(.home)
        app.activate()
        let workoutNotes = app.buttons["Workout notes & soreness"]
        if !workoutNotes.isHittable { app.swipeUp() }
        workoutNotes.tap()
        let notes = app.webViews.textViews["Workout notes"]
        XCTAssertTrue(notes.waitForExistence(timeout: 10), app.debugDescription)
        notes.tap()
        notes.typeText("Steady on iPhone.")
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5))
        let saveNotes = app.buttons["Save workout notes"]
        XCTAssertGreaterThan(app.keyboards.firstMatch.frame.height, 150)
        XCTAssertLessThan(app.keyboards.firstMatch.frame.minY, app.frame.maxY - 150)
        XCTAssertTrue(saveNotes.isHittable)
        XCTAssertLessThanOrEqual(saveNotes.frame.maxY, app.keyboards.firstMatch.frame.minY)
        saveNotes.tap()
        XCTAssertTrue(app.staticTexts["Workout notes saved."].waitForExistence(timeout: 15), app.debugDescription)
        let finish = app.buttons["Finish workout"]
        if !finish.isHittable { app.swipeUp() }
        finish.tap()
        let confirm = app.buttons["Finish and save workout"]
        XCTAssertTrue(confirm.waitForExistence(timeout: 10))
        confirm.tap()
        XCTAssertTrue(app.links["Back to workout history"].waitForExistence(timeout: 15))
        app.terminate()
        app.launch()
        app.open(try XCTUnwrap(URL(string: "easy://app/training?view=history")))
        let result = app.links.matching(NSPredicate(format: "label CONTAINS %@", "Freestyle workout")).firstMatch
        XCTAssertTrue(result.waitForExistence(timeout: 15), app.debugDescription)
        app.swipeUp()
        result.tap()
        XCTAssertTrue(app.staticTexts["8 reps"].waitForExistence(timeout: 15), app.debugDescription)
        XCTAssertTrue(app.staticTexts["Steady on iPhone."].exists)
        XCTAssertTrue(app.links["Back to workout history"].exists)
        let saved = XCTAttachment(screenshot: app.screenshot())
        saved.name = "iPhone saved workout"
        saved.lifetime = .keepAlways
        add(saved)
    }

    func testMealDraftAndSavedResult() throws {
        continueAfterFailure = false
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "fixture", withExtension: "json"))
        let fixture = try JSONDecoder().decode(Fixture.self, from: Data(contentsOf: url))
        let app = XCUIApplication(bundleIdentifier: "com.easy.client")
        app.launch()
        app.open(try XCTUnwrap(URL(string: "easy://app/invite/\(fixture.token)")))
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
        let mealURL = try XCTUnwrap(URL(string: "easy://app/nutrition/days/\(fixture.nutritionDate)/lunch"))
        app.open(mealURL)
        let addItem = app.buttons["Add food or recipe"]
        XCTAssertTrue(addItem.waitForExistence(timeout: 15), app.debugDescription)
        addItem.tap()
        let search = app.webViews.searchFields["Search library"]
        XCTAssertTrue(search.waitForExistence(timeout: 15), app.debugDescription)
        search.tap()
        search.typeText("iPhone rice")
        app.buttons["Search"].tap()
        let choose = app.buttons["Choose iPhone rice"]
        XCTAssertTrue(choose.waitForExistence(timeout: 15), app.debugDescription)
        app.swipeUp()
        choose.tap()
        let portion = app.webViews.textFields["Portion (g)"]
        XCTAssertTrue(portion.waitForExistence(timeout: 15))
        portion.tap()
        portion.coordinate(withNormalizedOffset: CGVector(dx: 0.85, dy: 0.5)).tap()
        portion.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: 3) + "150")
        XCTAssertEqual(portion.value as? String, "150")
        XCTAssertTrue(app.staticTexts["Draft saved on this device."].waitForExistence(timeout: 10))
        let keyboard = XCTAttachment(screenshot: app.screenshot())
        keyboard.name = "iPhone meal keyboard"
        keyboard.lifetime = .keepAlways
        add(keyboard)
        app.terminate()
        app.launch()
        app.open(mealURL)
        XCTAssertTrue(portion.waitForExistence(timeout: 15))
        XCTAssertEqual(portion.value as? String, "150")
        let save = app.buttons["Save meal"]
        app.swipeUp()
        XCTAssertTrue(save.waitForExistence(timeout: 15))
        save.tap()
        XCTAssertTrue(app.staticTexts["Meal saved."].waitForExistence(timeout: 15), app.debugDescription)
        let total = app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "195 kcal")).firstMatch
        XCTAssertTrue(total.waitForExistence(timeout: 10), app.debugDescription)
        XCUIDevice.shared.press(.home)
        app.activate()
        XCTAssertTrue(total.waitForExistence(timeout: 15), app.debugDescription)
        app.terminate()
        app.launch()
        app.open(mealURL)
        XCTAssertTrue(portion.waitForExistence(timeout: 15))
        XCTAssertEqual(portion.value as? String, "150")
        let savedMeal = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "View saved meal")).firstMatch
        XCTAssertTrue(savedMeal.waitForExistence(timeout: 10), app.debugDescription)
        savedMeal.tap()
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "150 g")).firstMatch.waitForExistence(timeout: 15), app.debugDescription)
        let saved = XCTAttachment(screenshot: app.screenshot())
        saved.name = "iPhone saved meal"
        saved.lifetime = .keepAlways
        add(saved)
    }

    func testWeightDraftAndSavedResult() throws {
        continueAfterFailure = false
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "fixture", withExtension: "json"))
        let fixture = try JSONDecoder().decode(Fixture.self, from: Data(contentsOf: url))
        let app = XCUIApplication(bundleIdentifier: "com.easy.client")
        app.launch()
        app.open(try XCTUnwrap(URL(string: "easy://app/invite/\(fixture.token)")))
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
        let weightURL = try XCTUnwrap(URL(string: "easy://app/progress/weight/\(fixture.nutritionDate)"))
        app.open(weightURL)
        let weight = app.webViews.textFields["Weight"]
        XCTAssertTrue(weight.waitForExistence(timeout: 15), app.debugDescription)
        weight.tap()
        weight.typeText("74.25")
        XCTAssertEqual(weight.value as? String, "74.25")
        XCTAssertTrue(app.staticTexts["Draft saved on this device."].waitForExistence(timeout: 10))
        let save = app.buttons["Save weight"]
        XCTAssertTrue(save.isHittable, app.debugDescription)
        let keyboard = XCTAttachment(screenshot: app.screenshot())
        keyboard.name = "iPhone weight keyboard and save"
        keyboard.lifetime = .keepAlways
        add(keyboard)
        app.terminate()
        app.launch()
        app.open(weightURL)
        XCTAssertTrue(weight.waitForExistence(timeout: 15))
        XCTAssertEqual(weight.value as? String, "74.25")
        XCTAssertTrue(save.waitForExistence(timeout: 15))
        weight.tap()
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5))
        save.tap()
        XCTAssertTrue(app.staticTexts["Your weight is saved."].waitForExistence(timeout: 15), app.debugDescription)
        XCTAssertTrue(app.staticTexts["1 weight record"].waitForExistence(timeout: 10))
        app.buttons["Date range & units"].tap()
        XCTAssertTrue(app.staticTexts["Your progress view"].waitForExistence(timeout: 10), app.debugDescription)
        app.buttons["Close"].tap()
        XCUIDevice.shared.press(.home)
        app.activate()
        XCTAssertTrue(app.staticTexts["1 weight record"].waitForExistence(timeout: 15))
        app.terminate()
        app.launch()
        app.open(weightURL)
        XCTAssertTrue(weight.waitForExistence(timeout: 15))
        XCTAssertEqual(weight.value as? String, "74.25")
        let saved = XCTAttachment(screenshot: app.screenshot())
        saved.name = "iPhone saved weight after restart"
        saved.lifetime = .keepAlways
        add(saved)
    }

    @MainActor
    func testGoalDraftAndSavedResult() throws {
        continueAfterFailure = false
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "fixture", withExtension: "json"))
        let fixture = try JSONDecoder().decode(Fixture.self, from: Data(contentsOf: url))
        let app = XCUIApplication(bundleIdentifier: "com.easy.client")
        app.launch()
        app.open(try XCTUnwrap(URL(string: "easy://app/invite/\(fixture.goalToken)")))
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
        let weightURL = try XCTUnwrap(URL(string: "easy://app/account/goal"))
        app.open(weightURL)
        let weight = app.webViews.textFields["Goal weight"]
        XCTAssertTrue(weight.waitForExistence(timeout: 15), app.debugDescription)
        weight.tap()
        weight.typeText("74.25")
        XCTAssertEqual(weight.value as? String, "74.25")
        XCTAssertTrue(app.staticTexts["Draft saved on this device."].waitForExistence(timeout: 10))
        let save = app.buttons["Save goal"]
        XCTAssertTrue(save.isHittable, app.debugDescription)
        let keyboard = XCTAttachment(screenshot: app.screenshot())
        keyboard.name = "iPhone goal keyboard and save"
        keyboard.lifetime = .keepAlways
        add(keyboard)
        app.terminate()
        app.launch()
        app.open(weightURL)
        XCTAssertTrue(weight.waitForExistence(timeout: 15))
        XCTAssertEqual(weight.value as? String, "74.25")
        XCTAssertTrue(save.waitForExistence(timeout: 15))
        weight.tap()
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5))
        save.tap()
        XCTAssertTrue(app.staticTexts["Your goal is saved."].waitForExistence(timeout: 15), app.debugDescription)
        XCUIDevice.shared.press(.home)
        app.activate()
        XCTAssertTrue(weight.waitForExistence(timeout: 15))
        app.terminate()
        app.launch()
        app.open(weightURL)
        XCTAssertTrue(weight.waitForExistence(timeout: 15))
        XCTAssertEqual(weight.value as? String, "74.25")
        let saved = XCTAttachment(screenshot: app.screenshot())
        saved.name = "iPhone saved goal after restart"
        saved.lifetime = .keepAlways
        add(saved)
    }

    private func setConnection(_ control: String, available: Bool) async throws {
        let url = try XCTUnwrap(URL(string: "\(control)?available=\(available)"))
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        let (_, response) = try await URLSession.shared.data(for: request)
        XCTAssertEqual((response as? HTTPURLResponse)?.statusCode, 200)
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
        app.open(try XCTUnwrap(URL(string: "easy://app/invite/\(fixture.token)")))
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
        let messageURL = try XCTUnwrap(URL(string: "easy://app/messages"))
        app.open(messageURL)
        let input = app.webViews.textViews["Message your coach"]
        XCTAssertTrue(input.waitForExistence(timeout: 15), app.debugDescription)
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
        XCTAssertEqual(input.value as? String ?? "", "")
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
        XCTAssertTrue(app.buttons["Open audio"].waitForExistence(timeout: 15), app.debugDescription)
        app.buttons["Open audio"].tap()
        XCTAssertTrue(app.staticTexts["2 messages"].waitForExistence(timeout: 15), app.debugDescription)
        let media = XCTAttachment(screenshot: app.screenshot())
        media.name = "iPhone video and audio message"
        media.lifetime = .keepAlways
        add(media)
    }

    @MainActor
    func testPhotoSelectionAndSubmission() throws {
        continueAfterFailure = false
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "fixture", withExtension: "json"))
        let fixture = try JSONDecoder().decode(Fixture.self, from: Data(contentsOf: url))
        let app = XCUIApplication(bundleIdentifier: "com.easy.client")
        app.resetAuthorizationStatus(for: .photos)
        app.resetAuthorizationStatus(for: .camera)
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
        let capture = fixture.photoSource == "camera"
        let choose = app.buttons[capture ? "Take photo" : "Choose photo"]
        XCTAssertTrue(choose.waitForExistence(timeout: 15))
        let system = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        choose.tap()
        var useGallery = !capture
        if capture {
            XCTAssertTrue(system.buttons["Allow"].waitForExistence(timeout: 10), system.debugDescription)
            system.buttons["Allow"].tap()
            let shutter = app.buttons["Take Picture"]
            XCTAssertTrue(shutter.waitForExistence(timeout: 15), app.debugDescription)
            #if targetEnvironment(simulator)
            // The simulator opens capture but does not supply an image after shutter.
            app.buttons["DismissImagePickerButton"].tap()
            XCTAssertTrue(choose.waitForExistence(timeout: 10))
            app.buttons["Choose photo"].tap()
            useGallery = true
            #else
            shutter.tap()
            let usePhoto = app.buttons["Use Photo"]
            XCTAssertTrue(usePhoto.waitForExistence(timeout: 15), app.debugDescription)
            usePhoto.tap()
            #endif
        }
        if useGallery && fixture.photoAccess == "limited" {
            let limit = system.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Limit Access")).firstMatch
            XCTAssertTrue(limit.waitForExistence(timeout: 10), system.debugDescription)
            limit.tap()
            let library = XCUIApplication(bundleIdentifier: "com.apple.mobileslideshow.photospicker")
            let photo = library.images.matching(NSPredicate(format: "label BEGINSWITH %@", "Photo,")).firstMatch
            XCTAssertTrue(photo.waitForExistence(timeout: 25), library.debugDescription)
            // PhotosPicker exposes image bounds but no accessibility hit point.
            photo.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
            library.buttons["Done"].coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
        } else if useGallery {
            let allow = system.buttons["Allow Full Access"]
            XCTAssertTrue(allow.waitForExistence(timeout: 10), system.debugDescription)
            allow.tap()
        }
        if useGallery {
            let image = app.scrollViews.buttons.firstMatch
            XCTAssertTrue(image.waitForExistence(timeout: 10), app.debugDescription)
            if fixture.photoAccess == "limited" {
                XCTAssertEqual(app.scrollViews.buttons.count, 1, "Only the permitted photo appears in Easy's library")
            }
            image.tap()
            app.buttons["Done"].tap()
        }
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
        saved.name = "iPhone saved progress photo (\(useGallery ? "gallery" : "camera"), \(fixture.photoAccess ?? "full") access)"
        saved.lifetime = .keepAlways
        add(saved)
    }

    struct Fixture: Decodable {
        let email: String
        let token: String
        let goalToken: String
        let formToken: String
        let formEmail: String
        let assignmentId: String
        let apiControlURL: String?
        let photoAccess: String?
        let photoSource: String?
        let photoToken: String
        let photoAssignmentId: String
        let nutritionDate: String
    }
}
