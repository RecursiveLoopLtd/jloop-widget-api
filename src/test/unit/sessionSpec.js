"use strict";

var sessions = require("../../js/session");
var model = require("../../js/model");

describe("session", function() {
  jasmine.clock().install();
  var baseTime = new Date(2000, 1, 1);

  beforeEach(function() {
    jasmine.clock().mockDate(baseTime);
  });

  it("should clear values", function() {
    var session = sessions.session();
    session.put("foo", "bar");
    session.clear();

    expect(session.get("foo")).toBe(null);
  });

  it("should store values", function() {
    var session = sessions.session();
    session.put("foo", "bar");
    expect(session.get("foo")).toBe("bar");
  });

  it("should store complex objects", function() {
    var session = sessions.session();

    function Thing(spec) {
      spec = spec || {};

      this.a = spec.a || 0;
      this.b = spec.b || "";
      this.c = {
        d: spec.c.d || 0.0
      };
    }

    Thing.prototype.foo = function() {
      return this.a * this.c.d;
    };

    var obj = new Thing({
      a: 2,
      b: "three",
      c: {
        d: 4.1
      }
    });

    session.put("obj", obj);
    var obj2 = session.get("obj", Thing);

    expect(obj2.a).toBe(2);
    expect(obj2.b).toBe("three");
    expect(obj2.c.d).toBe(4.1);

    expect(obj2.foo()).toBe(8.2);
  });

  it("should remove values", function() {
    var session = sessions.session();

    session.put("foo", "bar");
    session.remove("foo");
    expect(session.get("foo")).toBe(null);
  });

  it("Should expire", function() {
    var session = sessions.session();

    session.setLifetime(4);
    session.put("foo", "bar");

    jasmine.clock().tick(4000);;
    expect(session.get("foo")).toBe("bar");

    jasmine.clock().tick(1);
    expect(session.get("foo")).toBe(null);
  });

  it("should contain same data for instances with the same prefix", function() {
    var session1 = sessions.session("s1");
    var session2 = sessions.session("s2");

    session1.put("foo", 123);
    session2.put("foo", 456);

    expect(session1.get("foo")).toBe(123);
    expect(session2.get("foo")).toBe(456);
  });

  it("should contain different data for instances with different prefixes", function() {
    var session1 = sessions.session("s1");
    var session2 = sessions.session("s1");

    session1.put("foo", 123);
    session2.put("foo", 456);

    expect(session1.get("foo")).toBe(456);
    expect(session2.get("foo")).toBe(456);
  });

  it("should store and restore a Transcript instance", function() {
    var session = sessions.session();

    var t1 = new model.Transcript();
    var e1 = new model.VisitorMessage({
      customerId: "abc",
      agentId: "def",
      visitorId: "ace",
      message: "Hello"
    });

    t1.addEvent(e1);

    session.put("transcript", t1);

    var t2 = session.get("transcript", model.Transcript);
    var e2 = t2.events[0];

    expect(e2.customerId).toBe(e1.customerId);
    expect(e2.agentId).toBe(e1.agentId);
    expect(e2.visitorId).toBe(e1.visitorId);
    expect(e2.message).toBe(e1.message);
  });
});

