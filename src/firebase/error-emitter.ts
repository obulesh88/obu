// A simple, global event emitter to broadcast permission errors from anywhere in the app.
// This allows a central listener to catch and display these errors for debugging
// without tightly coupling the UI components to the error display mechanism.

type Listener = (...args: any[]) => void;

class EventEmitter {
  private events: { [key: string]: Listener[] } = {};

  on(eventName: string, listener: Listener) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(listener);
  }

  emit(eventName: string, ...args: any[]) {
    const listeners = this.events[eventName];
    if (listeners) {
      listeners.forEach((l) => l(...args));
    }
  }

  off(eventName: string, listener: Listener) {
    const listeners = this.events[eventName];
    if (listeners) {
      this.events[eventName] = listeners.filter((l) => l !== listener);
    }
  }
}

export const errorEmitter = new EventEmitter();
