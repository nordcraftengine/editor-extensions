# Editor Extensions

The [toddle](https://toddle.dev?utm_source=github) editor previews toddle pages/components in an iframe. In order to work with authenticated APIs, it's necessary to run a browser extension that helps setting cookies in the iframe. This is normally restricted by the browser since the editor and the iframe run on 2 different origins.

This repository holds code for the relevant browser extensions - 1 for Chrome and 1 for Firefox.

## Features

The extension(s) are responsible for 3 things:

1. Setting cookies in the iframe when (fetch) requests return [Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie) headers
2. Removing cookies in the iframe when (fetch) requests return `Set-Cookie` headers with an empty value for a cookie
3. Copying cookies from the editor --> the iframe. This is useful when working with authenticated APIs where you're already logged in for instance.

## Testing

To test the different aspects of the extensions, it's recommended to:

1. Run an app that sets an `access_token` (or any cookie) using the `Set session cookies` action. Verify the cookie is actually set for the iframe (on the `*.toddle.site` domain)
2. Call the `/.toddle/logout` endpoint to clear the `access_token` cookie, and verify the cookie actually gets removed from the iframe
3. After logging in outside of the iframe on your preview domain (`*.toddle.site`), verify that you're still logged in when opening the project in the editor

For now, we use this project for testing: https://erik_auth.toddle.site/
Everyone should be able to sign up and test login/logout on the login screen.

## Limitations

- Currently, setting/removing cookies in the extensions doesn't block network requests. Hence, if you remove a cookie and immediately request your session, the session call will still include the cookie.

## Roadmap

- Allow blocking requests while adding/removing cookies to ensure future requests have the correct cookies
- Add a Safari extension

## Contributing

Feel free to open an [issue](/issues) or a [PR](/pulls) if you find a bug/feature that you feel we should address. You can always reach out on [Discord](https://discord.com/invite/QcFjjXU3E7)
