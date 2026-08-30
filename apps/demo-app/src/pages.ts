const sharedStyles = `
  body { max-width: 32rem; margin: 4rem auto; padding: 0 1rem; font-family: system-ui, sans-serif; }
  form { display: grid; gap: 1rem; }
  label { display: grid; gap: 0.35rem; }
  input, button { font: inherit; padding: 0.65rem; }
  [role="alert"] { color: #a11; }
`;

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>${sharedStyles}</style>
  </head>
  <body>${body}</body>
</html>`;
}

export function loginPage(message?: string): string {
  const alert = message ? `<p role="alert">${message}</p>` : "";
  return page(
    "Demo login",
    `<main>
      <h1>Sign in</h1>
      ${alert}
      <form method="post" action="/login">
        <label>Email <input name="email" type="email" autocomplete="username" required /></label>
        <label>Password <input name="password" type="password" autocomplete="current-password" required /></label>
        <button type="submit">Sign in</button>
      </form>
    </main>`,
  );
}

export function dashboardPage(): string {
  return page(
    "Demo dashboard",
    `<main>
      <h1 data-testid="dashboard-heading">Dashboard</h1>
      <p>The deterministic login journey completed successfully.</p>
    </main>`,
  );
}
