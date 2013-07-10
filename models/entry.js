var db = module.parent.exports.db;

var Entry = function(attrs) {
  var self = this;

  self.errors = {};
  
  for(attr in attrs) {
    if (attrs.hasOwnProperty(attr)) {
      self[attr] = attrs[attr];
    }
  }
  
  self.created_at = Date.now();
  
  function isValid() {
    var valid = true;
    if (self.subdomain == '') {
      self.errors['subdomain'] = 'cannot be blank';
      valid = false;
    } else if (self.subdomain.length > 255) {
      self.errors['subdomain'] = 'cannot be more than 255 characters';
      valid = false;
    }
    if (self.name == '') {
      self.errors['name'] = 'cannot be blank';
      valid = false;
    } else if (self.name.length > 150) {
      self.errors['name'] = 'cannot be more than 100 characters';
      valid = false;
    }
    if (self.message == '') {
      self.errors['message'] = 'cannot be blank';
      valid = false;
    } else if (self.message.length > 140) {
      self.errors['message'] = 'cannot be more than 140 characters';
      valid = false;
    }    
    return valid;
  }

  function save(success, failure) {
    if (isValid()) {
      db().lpush(self.subdomain, toJSON(), function(err, reply) {
        if (err) {
          failure.call(this, err);
        } else {
          success.call(this, reply);
        }
      });
    } else {
      failure.call(this, new Error('Entry is not valid'));
    }
    return false;
  }
  
  function asJSON() {
    return {
      name: self.name,
      message: self.message,
      created_at: self.created_at
    }
  }  

  function toJSON() {
    return JSON.stringify(asJSON());
  }
  
  self.save = save;
  self.asJSON = asJSON;
  self.toJSON = toJSON;
  self.isValid = isValid;
 }

Entry.per_page = 10;

Entry.get = function(subdomain, page, success, failure) {
  var start = 0;
  page = page || 1;
  
  if (page > 1) {
    start = (page - 1) * Entry.per_page
  }
  
  db().lrange(subdomain, start, (start + Entry.per_page) - 1, function(err, reply) {
    if (err && failure) {
      failure.call(this, err);
    } else {
      success.call(this, reply);
    }
  });
}

module.exports = Entry