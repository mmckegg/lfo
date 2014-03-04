// cache curve generation

// schedule as much as possible at a time

// interpolate curve until 2x bigger or 4x smaller
module.exports = LFO

function LFO(audioContext){

  if (!(this instanceof LFO)){
    return new LFO(audioContext)
  }

  this._targets = []
  this.context = audioContext
  this._processSchedule = processSchedule.bind(this)
  this.rate = 1
  this.amp = 0.5
  this.value = 0.5
  this.phaseOffset = 0
  this.min = -Infinity
  this.max = Infinity
  this.shape = 'sine'
}

function processSchedule(schedule){
  var duration = this.context.currentTime - this._lastSchedule
  var from = this.context.currentTime
  var to = from + duration

  if (this._scheduledTo > from && this._scheduledTo < to){
    this._doSchedule(this._scheduledTo, to)
  }

  this._lastSchedule = from
}

LFO.prototype = {

  constructor: LFO,

  start: function(at){
    at = at || this.context.currentTime
    this._curve = generateCurve(this)
    this._cycleDuration = this._curve.length / this.context.sampleRate
    this._scheduledTo = 0

    this._doSchedule(at, at + 0.2)

    // set up rescheduler
    this._lastSchedule = at
    this._rescheduler = setInterval(this._processSchedule, 100)
  },

  stop: function(at){
    at = at || this.context.currentTime
    this._doSchedule(this._scheduledTo, at)
    cancelValues(this._targets, at)
    setValues(this._targets, this.value, at)
    // release rescheduler
    clearInterval(this._rescheduler)
  },

  _doSchedule: function(timeFrom, timeTo){
    console.log('schedule', timeFrom, timeTo)
    this._scheduledTo = timeFrom

    while (this._scheduledTo < timeTo) {
      setValueCurves(this._targets, this._curve, this._scheduledTo, this._cycleDuration)
      this._scheduledTo += this._cycleDuration
    }
  },

  connect: function(param){
    if (!~this._targets.indexOf(param)){
      //TODO: handle adding targets after start
      this._targets.push(param)
    }
  },

  disconnect: function(){
    cancelValues(this._targets, this.context.currentTime)
    setValues(this._targets, this.value, this.context.currentTime)
    this._targets.length = 0
  }

}

function setValueCurves(targets, curve, at, duration){
  for (var i=0;i<targets.length;i++){
    var target = targets[i]
    target.setValueCurveAtTime(curve, at, duration)
  }
}

function cancelValues(targets, from){
  for (var i=0;i<targets.length;i++){
    var target = targets[i]
    target.cancelScheduledValues(from)
  }
}

function setValues(targets, value, at){
  for (var i=0;i<targets.length;i++){
    var target = targets[i]
    target.setValueAtTime(value, at)
  }
}


function generateCurve(node){
  var length = node.context.sampleRate / (Math.max(node.rate, 0.1))
  var curve = new Float32Array(length)
  var shape = shapes[node.shape] || shapes['sine']
  for (var i=0;i<length;i++){
    var phase = i / length + node.phaseOffset
    var nextValue = node.value + (shape(1 + phase) * node.amp)
    curve[i] = Math.min(node.max, Math.max(node.min, nextValue))
  }
  return curve
}

var shapes = {
  sine: function(t){
    return Math.sin(t * Math.PI * 2)
  },
  sawtooth: function(t){
    return blunt(-1 + ((t % 1) * 2))
  },
  sawtooth_i: function(t){
    return blunt(1 - ((t % 1) * 2))
  },
  triangle: function(t){
    var n = t % 0.5
    return t < 0.5 ? (-1 + n * 4) : (1 - n * 4)
  },
  square: function(t){
    return Math.max(-1, Math.min(1, shapes.sine(t)*20))
  }
}

function blunt(v){
  if (v > 0.999){
    var remain = v % 0.001
    return 0.999 - (remain * 1000 * 0.999)
  } else if (v < -0.999) {
    var remain = v % 0.001
    return -0.999 - (remain * 1000 * 0.999 )
  } else {
    return v
  }
}