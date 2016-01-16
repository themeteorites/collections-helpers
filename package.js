Package.describe({
  name: 'themeteorites:collections-helpers',
  version: '1.0.0',
  summary: 'adds useful things to Meteor.Collection',
  git: 'https://github.com/themeteorites/collections-helpers',
})

Npm.depends({
  "slug": "0.9.1"
})

Package.onUse(function (api) {
  api.versionsFrom('1.1.0.2')

  api.use(['themeteorites:roles@1.0.0'])
  api.use(['grigio:babel@0.1.0', 'stevezhu:lodash@3.0.0', 'dburles:collection-helpers@1.0.0'])

  api.export('SlugField')

  api.addFiles('bower_components/slug/slug.js', 'client')
  api.addFiles('collections-helpers.es6.js')
})
