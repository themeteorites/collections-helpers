if (!Meteor.Collection.prototype.extend) {
  Meteor.Collection.prototype.extend = function (o) {
    return _.extend(this, o)
  }
}

if (Meteor.Collection.prototype.attachSchema) {
  Meteor.Collection.prototype.extend({
    schema: function (schema) {
      if (!schema) {
        return this._schema_
      }
      this.attachSchema(this._schema_ = schema)
      return this
    }
  })
}
if (Meteor.Collection.prototype.helpers) {
  Meteor.Collection.prototype._helpers_ = Meteor.Collection.prototype.helpers
  Meteor.Collection.prototype.helpers = function () {
    this._helpers_.apply(this, arguments)
    return this
  }
}

if (Meteor.isServer) {
  Meteor.Collection.prototype.extend({
    addIndex (...args) {
      this._ensureIndex(...args)
      return this
    }
  })
} else if (Meteor.isClient) {
  Meteor.Collection.prototype.extend({
    addIndex () {
      // do nothing
      return this
    }
  })
}

if (Meteor.isServer) {
  let methods = ['allow', 'deny']
  methods.forEach(method => {
    Meteor.Collection.prototype[`_${method}_`] = Meteor.Collection.prototype[method]
    Meteor.Collection.prototype[method] = function () {
      if (arguments.length === 1) {
        return this[`_${method}_`].apply(this, arguments)
      }
      let [methods, check] = _.rest(arguments, -1)
      if (methods.length === 1 && methods[0] === '*') {
        methods = ['insert', 'update', 'remove']
      }
      return this[`_${method}_`].apply(this, [_.reduce(methods, (ret, m) => {
        ret[m] = check
        return ret
      }, {})])
    }
  })
}

let entityNames = ['owner', 'user']
let propPaths = ['Id', '._id', '.id']
let pathsToTry = _.flatten(_.map(entityNames, ent => propPaths.map(prop => ent + prop)))
let defaultOwnerUserId = function (doc) {
  for (let ii = 0; ii < pathsToTry.length; ii++) {
    let val = _.get(doc, pathsToTry[ii])
    if (val !== undefined) {
      return val
    }
  }
  //return _.get(doc, 'userId', _.get(doc, 'user._id', _.get(doc, 'user.id')))
}

function parseOpts (opts) {
  let {ownerUserId, fields} = opts

  if (ownerUserId !== false) {
    this._ownerUserId = ownerUserId ? _.property(ownerUserId) : defaultOwnerUserId
  }
  this._fieldPermissions = fields
}

if (Meteor.isServer) {
  /**
   * permissions currently only of type {fieldName,role}
   * @param opts
   */
  Meteor.Collection.prototype.setPermissions = function (opts) {
    parseOpts.apply(this, arguments)

    // add allow callback for when ownerId matches
    let self = this
    this.allow('insert', 'update', 'remove', function (userId, doc) {
      return isAdmin(userId) || (userId && self._ownerUserId && ideq(userId, self._ownerUserId(doc)))
    })

    // add deny callbacks for each field with special permissions
    this._fieldPermissions.forEach(perm => {
      let checkFn = function (userId, doc, fieldNames) {
        if (fieldNames && fieldNames.includes(perm.fieldName) || !fieldNames && doc[perm.fieldName] !== undefined) {
          return !hasRole.apply(this, [userId, perm.role])
        }
      }
      this.deny('insert', 'update', checkFn)
    })
  }
} else if (Meteor.isClient) {
  Meteor.Collection.prototype.setPermissions = function (opts) {
    parseOpts.apply(this, arguments)
  }
}
idval = function (id) {
  if (!id || !id.valueOf) {
    return id
  }
  return id.valueOf()
}
ideq = function (id1, id2) {
  return _.eq(idval(id1), idval(id2))
}
if (typeof hasRole !== 'undefined') {
  Meteor.Collection.prototype.canEditField = function (doc, fieldName, userId) {
    userId = userId || getUserId()
    // check we have at least one positive "allow" rule
    if (!(isAdmin(userId) || userId && this._ownerUserId && ideq(userId, this._ownerUserId(doc)))) {
      return false
    }
    // check we have no negative "deny" rules
    return !_.find(this._fieldPermissions, perm => perm.fieldName === fieldName && !hasRole(userId, perm.role))
  }
}

let slug
if (typeof Npm !== 'undefined') {
  slug = Npm.require('slug')
} else {
  slug = window.slug
}

SlugField = function (fromField = 'name') {
  return {
    type: String,
    autoValue() {
      let val = this.field(fromField)
      if (this.value && !val.operator) {
        // leave unchanged
        return
      }
      // being changed
      if (!val.value) {
        this.unset()
        return
      }
      return slug(val.value)
    }
  }
}
