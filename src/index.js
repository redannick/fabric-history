
/**
 * Override the initialize function for the _historyInit();
 */
fabric.Canvas.prototype.initialize = (function(originalFn) {
  return function(...args) {
    originalFn.call(this, ...args);
    this._historyInit();
    return this;
  };
})(fabric.Canvas.prototype.initialize);

/**
 * Override the dispose function for the _historyDispose();
 */
fabric.Canvas.prototype.dispose = (function(originalFn) {
  return function(...args) {
    originalFn.call(this, ...args);
    this._historyDispose();
    return this;
  };
})(fabric.Canvas.prototype.dispose);

/**
 * Returns current state of the string of the canvas
 */
fabric.Canvas.prototype._historyNext = function () {
  return JSON.stringify(this.toDatalessJSON(this.extraProps));
}

/**
 * Returns an object with fabricjs event mappings
 */
fabric.Canvas.prototype._historyEvents = function() {
  return {
    "object:added": this._historySaveAction,
    "object:removed": this._historySaveAction,
    "object:modified": this._historySaveAction,
    "object:skewing": this._historySaveAction
  }
}

/**
 * Initialization of the plugin
 */
fabric.Canvas.prototype._historyInit = function () {
  this.historyUndo = [];
  this.historyRedo = [];
  
  this.on(this._historyEvents());
}

/**
 * Remove the custom event listeners
 */
fabric.Canvas.prototype._historyDispose = function () {
  this.off(this._historyEvents())
}

/**
 * It pushes the state of the canvas into history stack
 */
fabric.Canvas.prototype._historySaveAction = function () {

  if (this.historyProcessing)
    return;

  const json = this.historyNextState;
  let next = this._historyNext();

  if (json === next)
    return;

  this.historyRedo = [];
  this.historyUndo.push(json);
  this.historyNextState = next;
  this.fire('history:append', {
    json: json
  });
}

/**
 * Allow manual recording of an undo point - useful when the _historyEvents
 * don't cover all the events required (e.g. updating text) 
 */
fabric.Canvas.prototype.recordUndoPoint = function () {
  this._historySaveAction();
}

/**
 * Undo to latest history. 
 * Pop the latest state of the history. Re-render.
 * Also, pushes into redo history.
 */
fabric.Canvas.prototype.undo = function () {
  if (this.historyProcessing)
    return;
  // The undo process will render the new states of the objects
  // Therefore, object:added and object:modified events will triggered again
  // To ignore those events, we are setting a flag.
  this.historyProcessing = true;

  const history = this.historyUndo.pop();
  if (history) {
    // Push the current state to the redo history
    var currentState = this._historyNext()
    this.historyNextState = history;
    this.historyRedo.push(currentState);

    this.loadFromJSON(history, () => {
      this.renderAll();
      this.fire('history:undo');
      this.historyProcessing = false;
    })
  } else {
    this.historyProcessing = false;
  }

}

/**
 * Redo to latest undo history.
 */
fabric.Canvas.prototype.redo = function () {
  if (this.historyProcessing)
    return;
  // The undo process will render the new states of the objects
  // Therefore, object:added and object:modified events will triggered again
  // To ignore those events, we are setting a flag.
  this.historyProcessing = true;
  const history = this.historyRedo.pop();
  if (history) {
    // Every redo action is actually a new action to the undo history
    var currentState = this._historyNext()
    this.historyNextState = history;
    this.historyUndo.push(currentState);

    this.loadFromJSON(history, () => {
      this.renderAll();
      this.fire('history:redo');
      this.historyProcessing = false;
    })
  } else {
    this.historyProcessing = false;
  }
}

/**
 * Clear undo and redo history stacks
 */
fabric.Canvas.prototype.clearHistory = function() {
  this.historyUndo = [];
  this.historyRedo = [];
  this.fire('history:clear');
}