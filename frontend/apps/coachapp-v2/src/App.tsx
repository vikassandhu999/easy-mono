import {Toast} from '@heroui/react';
import {BrowserRouter, Route, Routes} from 'react-router';

export default function App() {
  return (
    <BrowserRouter>
      <Toast.Provider />
      <div className="min-h-screen bg-background text-foreground">
        <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-4 px-6 py-16">
          <Routes>
            <Route
              element={
                <div className="flex flex-col items-center gap-4 text-center">
                  <h1 className="text-3xl font-semibold">CoachApp V2</h1>
                  <p className="text-base text-foreground/70">
                    Route scaffolding is in place. Add feature pages as you build them.
                  </p>
                </div>
              }
              path="/"
            />
            <Route
              element={<span>Register</span>}
              path="/register"
            />
            <Route
              element={<span>Verify Registration</span>}
              path="/register/verify"
            />
            <Route
              element={<span>Login</span>}
              path="/login"
            />
            <Route
              element={<span>Verify Login</span>}
              path="/login/verify"
            />
            <Route
              element={<span>Onboarding</span>}
              path="/onboarding"
            />
            <Route
              element={<span>Clients</span>}
              path="/clients"
            />
            <Route
              element={<span>Client View</span>}
              path="/clients/:id"
            />
            <Route
              element={<span>Library</span>}
              path="/library"
            />
            <Route
              element={<span>My Page</span>}
              path="/page"
            />
            <Route
              element={<span>Settings</span>}
              path="/settings"
            />
            <Route
              element={<span>Not Found</span>}
              path="*"
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
