import { Response } from "express";
import {
  Application,
  ParamsDictionary,
  Request,
} from "express-serve-static-core";
import { Socket } from "net";
import { ParsedQs } from "qs";

/**
 * Mock HTTP Response instances for TypeScript typing purposes.
 *
 * A little crazy that this is necessary. Give me a shout if you know a better way.
 * The Response object in Express is a class,
 * and we can't just create a new instance of it form there. We need to mock it out.
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

// Mock response headers
class MockResponseHeaders {
  headers: { [key: string]: string | string[] | undefined } = {};

  getHeader(name: string): string | string[] | undefined {
    return this.headers[name.toLowerCase()];
  }

  setHeader(name: string, value: string | string[]): void {
    this.headers[name.toLowerCase()] = value;
  }

  removeHeader(name: string): void {
    delete this.headers[name.toLowerCase()];
  }
}

// Mock response body
class MockResponseBody {
  body: any;
  statusCode: number;

  constructor() {
    this.body = null;
    this.statusCode = 200;
  }

  send(data: any) {
    this.body = data;
    return this as unknown as Response;
  }

  json(data: any) {
    this.body = data;
    return this as unknown as Response;
  }

  status(code: number) {
    this.statusCode = code;
    return this as unknown as Response;
  }
}

// Mock response
export class MockResponse
  extends MockResponseBody
  implements Partial<Response>
{
  constructor() {
    super();
    this.headers = new MockResponseHeaders();
    this.app = {} as Application<Record<string, any>>;
    this.req = {} as Request<
      ParamsDictionary,
      any,
      any,
      ParsedQs,
      Record<string, any>
    >;
  }

  // Implementing commonly used Response methods
  getHeader = (name: string) => this.headers.getHeader(name);

  setHeader = (name: string, value: string | number | readonly string[]) => {
    this.headers.setHeader(name, value as string | string[]);
    return this as unknown as Response;
  };

  removeHeader = (name: string) => {
    this.headers.removeHeader(name);
    return this as unknown as Response;
  };

  // Additional methods from Response that might be used in tests
  sendStatus = (code: number) => {
    this.statusCode = code;
    return this as unknown as Response;
  };

  // General Properties
  headers: MockResponseHeaders;
  app: Application<Record<string, any>>;
  req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>;
  statusMessage: string = "";
  charset: string = "";
  locals = {};

  // Response Handling Methods
  links = jest.fn();
  jsonp = jest.fn();
  sendFile = jest.fn();
  sendfile = jest.fn();
  send = jest.fn();
  redirect = jest.fn();
  render = jest.fn();
  download = jest.fn();
  contentType = jest.fn();
  type = jest.fn();
  format = jest.fn();
  attachment = jest.fn();
  end = jest.fn();

  // Header Management
  set = jest.fn();
  header = jest.fn();
  get = jest.fn();
  appendHeader = jest.fn();
  setHeaders = jest.fn();
  getHeaders = jest.fn();
  getHeaderNames = jest.fn();
  hasHeader = jest.fn();
  flushHeaders = jest.fn();
  vary = jest.fn();
  clearCookie = jest.fn();
  cookie = jest.fn();
  location = jest.fn();

  // Connection Properties
  connection: Socket | null = null;
  socket: Socket | null = null;
  assignSocket = jest.fn();
  detachSocket = jest.fn();
  writeHead = jest.fn();
  shouldKeepAlive: boolean = false;
  sendDate: boolean = false;
  strictContentLength: boolean = false;
  chunkedEncoding: boolean = false;
  useChunkedEncodingByDefault: boolean = false;
  headersSent: boolean = false;
  finished: boolean = false;

  // Writable Stream Properties and Methods
  writable: boolean = false;
  writableEnded: boolean = false;
  writableFinished: boolean = false;
  writableLength: number = 0;
  writableCorked: number = 0;
  writableHighWaterMark: number = 0;
  writableObjectMode: boolean = false;
  writableNeedDrain: boolean = false;
  writeableFinished = false;
  writeableLength = 0;
  writeableCorked = 0;
  writeableUncorked = false;
  writeableEncoding = "";
  writeableHighWaterMark = 0;
  _write = jest.fn();
  _destroy = jest.fn();
  _final = jest.fn();
  write = jest.fn();
  cork = jest.fn();
  uncork = jest.fn();
  destroy = jest.fn();
  setDefaultEncoding = jest.fn();
  addTrailers = jest.fn();

  // Timeout Handling
  setTimeout = jest.fn();

  // HTTP-Specific Methods
  init = jest.fn();
  append = jest.fn();
  writeContinue = jest.fn();
  writeEarlyHints = jest.fn();
  writeProcessing = jest.fn();

  // Event Handling Methods
  addListener = jest.fn();
  emit = jest.fn();
  on = jest.fn();
  once = jest.fn();
  prependListener = jest.fn();
  prependOnceListener = jest.fn();
  removeListener = jest.fn();
  removeAllListeners = jest.fn();
  setMaxListeners = jest.fn();
  getMaxListeners = jest.fn();
  listeners = jest.fn();
  rawListeners = jest.fn();
  listenerCount = jest.fn();
  eventNames = jest.fn();
  off = jest.fn();
  pipe = jest.fn();
  compose = jest.fn();

  // Miscellaneous Properties
  closed: boolean = false;
  destroyed: boolean = false;
  errored: Error | null = null;
}

// Helper function to create a mock response
const createMockResponse = (): MockResponse => {
  return new MockResponse();
};

export default createMockResponse;
