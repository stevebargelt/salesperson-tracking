fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## iOS

### ios certificates

```sh
[bundle exec] fastlane ios certificates
```

Setup certificates and provisioning profiles

### ios sync_certificates

```sh
[bundle exec] fastlane ios sync_certificates
```

Sync certificates (read-only)

### ios force_appstore_certs

```sh
[bundle exec] fastlane ios force_appstore_certs
```

Force regenerate App Store certificates with updated entitlements

### ios build_development

```sh
[bundle exec] fastlane ios build_development
```

Build development version

### ios build_staging

```sh
[bundle exec] fastlane ios build_staging
```

Build staging version for internal testing

### ios build_production

```sh
[bundle exec] fastlane ios build_production
```

Build production version for App Store

### ios deploy_beta

```sh
[bundle exec] fastlane ios deploy_beta
```

Deploy to TestFlight

### ios deploy_production

```sh
[bundle exec] fastlane ios deploy_production
```

Deploy to App Store

### ios test

```sh
[bundle exec] fastlane ios test
```

Run tests

### ios screenshots

```sh
[bundle exec] fastlane ios screenshots
```

Take screenshots

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
