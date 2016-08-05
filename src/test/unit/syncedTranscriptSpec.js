"use strict";

var model = require("../../js/model");
var sessions = require("../../js/session");
var syncedTranscript = require("../../js/syncedTranscript");

describe("syncedTranscript", function() {
  it("should log events", function() {
    var session = sessions.session();
    var t1 = syncedTranscript(session);

    var e1 = new model.VisitorMessage({
      customerId: "abc",
      agentId: "def",
      visitorId: "ace",
      message: "Hello"
    });

    t1.addEvent(e1);

    var e2 = t1.getEvents()[0];

    expect(e2.customerId).toBe(e1.customerId);
    expect(e2.agentId).toBe(e1.agentId);
    expect(e2.visitorId).toBe(e1.visitorId);
    expect(e2.message).toBe(e1.message);
  });

  it("should extract transcript from session", function() {
    var session = sessions.session();
    var t1 = syncedTranscript(session);

    var e1 = new model.VisitorMessage({
      customerId: "abc",
      agentId: "def",
      visitorId: "ace",
      message: "Hello"
    });

    t1.addEvent(e1);

    var t2 = syncedTranscript(session);
    var e2 = t2.getEvents()[0];

    expect(e2.customerId).toBe(e1.customerId);
    expect(e2.agentId).toBe(e1.agentId);
    expect(e2.visitorId).toBe(e1.visitorId);
    expect(e2.message).toBe(e1.message);
  });
});

