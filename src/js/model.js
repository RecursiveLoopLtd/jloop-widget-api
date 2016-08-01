/**
 * Contains constructor functions for objects sent and received
 * to/from the server. Each function takes a spec object, which
 * can either be an existing object or a freshly parsed JSON
 * object (i.e. containing just string and object fields).
 *
 * @module model
 */

var err = require("./exceptions");
var utils = require("./utils");

var Event = function(eventType) {
  this.eventType = eventType;
};

function VisitorMessage(spec) {
  Event.call(this, "VisitorMessage");
  this.customerId = spec.customerId;
  this.agentId = spec.agentId;
  this.visitorId = spec.visitorId;
  this.visitorName = spec.visitorName;
  this.message = spec.message;
  this.timestamp = spec.timestamp || new Date().getTime();
};

utils.inherits(VisitorMessage, Event);

function AgentMessage(spec) {
  Event.call(this, "AgentMessage");
  this.customerId = spec.customerId;
  this.agentId = spec.agentId;
  this.visitorId = spec.visitorId;
  this.visitorName = spec.visitorName;
  this.message = spec.message;
  this.timestamp = spec.timestamp || new Date().getTime();
};

utils.inherits(AgentMessage, Event);

function VisitorStatusChange(spec) {
  Event.call(this, "VisitorStatusChange");
  this.visitorId = spec.visitorId;
  this.visitorName = spec.visitorName;
  this.customerId = spec.customerId;
  this.agentId = spec.agentId;
  this.status = spec.status;
  this.timestamp = spec.timestamp || new Date().getTime();
};

utils.inherits(VisitorStatusChange, Event);

function AgentStatusChange(spec) {
  Event.call(this, "AgentStatusChange");
  this.agentId = spec.agentId;
  this.status = spec.status;
  this.timestamp = spec.timestamp || new Date().getTime();
};

utils.inherits(AgentStatusChange, Event);

function AgentStatus(spec) {
  this.agentId = spec.agentId;
  this.status = spec.status;
  this.timestamp = spec.timestamp || new Date().getTime();
};

function Agent(spec) {
  this.agentId = spec.agentId;
  this.customerId = spec.customerId;
  this.displayName = spec.displayName;
  this.welcomeMessage = spec.welcomeMessage;
  this.status = new AgentStatus(spec.status);
};

function AgentList(spec) {
  this.agents = spec.agents.map(function(agent) {
    return new Agent(agent);
  }) || [];
};

function ServerEndpoint(spec) {
  this.nodeId = spec.nodeId;
  this.url = spec.url;
};

function fromPojo(pojo) {
  switch (pojo.eventType) {
    case "VisitorMessage":
      return new VisitorMessage(pojo);
    break;
    case "AgentMessage":
      return new AgentMessage(pojo);
    break;
    case "VisitorStatusChange":
      return new VisitorStatusChange(pojo);
    break;
    case "AgentStatusChange":
      return new AgentStatusChange(pojo);
    break;
    default:
      throw new err.JLoopException("No such model type");
  };
}

module.exports = {
  Event: Event,
  VisitorMessage: VisitorMessage,
  AgentMessage: AgentMessage,
  VisitorStatusChange: VisitorStatusChange,
  AgentStatusChange: AgentStatusChange,
  Agent: Agent,
  AgentStatus: AgentStatus,
  AgentList: AgentList,
  ServerEndpoint: ServerEndpoint,
  fromPojo: fromPojo
};

