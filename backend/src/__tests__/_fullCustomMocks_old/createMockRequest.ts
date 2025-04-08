import { Request } from "express";
import { IUser } from "models/userModel";
import { IncomingHttpHeaders } from "http";

/**
 * Mock HTTP Request instances for TypeScript typing purposes.
 *
 * A little crazy that this is necessary. Give me a shout if you know a better way.
 * The Request object in Express is a class, and we can't just create a new instance of it from there.
 * We need to mock it out, and TypeScript demands complete signature in this case, which is why
 * it's seems bloated.
 *
 * This is untested. Proceed with caution and consider that improvements
 * will probably be necessary.
 *
 * I [BB] worked this out with Chatbot and ChatGPT. They both a agree on this as the solution.
 * There are libraries that can help with this, but custom mocks offer more control.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */

interface AuthenticatedRequest extends Request {
  user?: IUser;
}

// Mock headers
export class MockHeaders implements IncomingHttpHeaders {
  "content-type"?: string;
  "set-cookie"?: string[];
  // Index signature to satisfy the IncomingHttpHeaders interface
  [key: string]: string | string[] | undefined;

  // Constructor to initialize properties
  constructor(initialHeaders?: { [key: string]: string | string[] }) {
    // Initialize default properties
    this["content-type"] =
      typeof initialHeaders?.["content-type"] === "string"
        ? initialHeaders["content-type"]
        : "application/json";

    this["set-cookie"] = Array.isArray(initialHeaders?.["set-cookie"])
      ? initialHeaders["set-cookie"]
      : [];

    // Initialize other headers from initialHeaders if provided
    if (initialHeaders) {
      for (const key in initialHeaders) {
        if (initialHeaders.hasOwnProperty(key)) {
          this[key] = initialHeaders[key];
        }
      }
    }
  }

  append = [];
  delete = [];
  get = [];
  has = [];
  set = [];
  getSetCookie = [];
  setCookie = [];
  values = [];
}

// Mock body
export class MockRequestBody {
  locked: boolean;
  cancel: boolean;

  constructor() {
    this.locked = false;
    this.cancel = false;
  }

  getReader = jest.fn();
  pipeThrough = jest.fn();
  pipeTo = jest.fn();
  tee = jest.fn();
  bodyUsed = false;
  arrayBuffer = jest.fn();
  blob = jest.fn();
  formData = jest.fn();
  json = jest.fn();
  text = jest.fn();
}

// Helper function to create a mock request
const createMockRequest = (user?: IUser): AuthenticatedRequest => {
  const req: Partial<Request> = {
    user,
    params: {},
    query: {},
    body: new MockRequestBody(),
    headers: new MockHeaders(),
    method: "GET",
    originalUrl: "/projects",
  };

  return req as AuthenticatedRequest;
};

export default createMockRequest;
