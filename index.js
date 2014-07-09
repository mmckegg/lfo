var extendTransform = require('audio-param-transform')
var CustomAudioParam = require('custom-audio-node/audio-param')

module.exports = LFO

function LFO(audioContext){

  if (!(this instanceof LFO)){
    return new LFO(audioContext)
  }

  this._curveKey = null
  this._targets = []
  this.context = audioContext
  this._processSchedule = processSchedule.bind(this)
  this._rate = 1
  this._amp = 0.5
  this._phaseOffset = 0
  this._min = -Infinity
  this._max = Infinity
  this._shape = 'sine'
  this._sync = false

  this.value = CustomAudioParam(audioContext, 'value')

  this.trigger = false
}

function processSchedule(){
  var currentTime = this.context.currentTime
  var duration = currentTime - this._lastSchedule
  var from = currentTime
  var to = from + duration

  // sync rate with tempo if this.sync
  this._refreshComputedRate()

  if (!this._curve){ // regenerate curve and schedule offsets
    var newCurve = getCurve(this)

    var offset = getOffset(this._scheduledFrom, this.context.currentTime, this._cycleDuration) % 1
    this._curve = newCurve
    this._cycleDuration = this._curve.length / this.context.sampleRate

    var timeOffset = this._cycleDuration * offset
    var stepOffset = Math.round(this._curve.length * offset)
    var offsetCurve = this._curve.subarray(stepOffset)
    var offsetDuration = offsetCurve.length / this.context.sampleRate

    cancelValues(this._targets, from)
    setValueCurves(this._targets, offsetCurve, from, offsetDuration)

    this._scheduledFrom = from - (this._cycleDuration * offset)
    from = this._scheduledTo = from + offsetDuration
    this._doSchedule(this._scheduledTo, to)
  }

  if (this._scheduledTo < to){
    this._doSchedule(this._scheduledTo, to)
  }

  this._lastSchedule = currentTime
}

function getOffset(start, currentTime, duration){
  if (duration){
    var value = Math.max(0, (currentTime - start) / duration)
    return value
  } else {
    return 0
  }
}

LFO.prototype = {

  constructor: LFO,

  get sync(){ return this._sync },
  set sync(value){
    this._sync = value
    this._curve = null
  },

  get rate(){ return this._rate },
  set rate(value){
    this._rate = value
    this._curve = null
  },

  get amp(){ return this._amp },
  set amp(value){
    this._amp = value
    this._curve = null
  },

  get phaseOffset(){ return this._phaseOffset },
  set phaseOffset(value){
    this._phaseOffset = value
    this._curve = null
  },

  get min(){ return this._min },
  set min(value){
    this._min = value
    this._curve = null
  },

  get max(){ return this._max },
  set max(value){
    this._max = value
    this._curve = null
  },

  get shape(){ return this._shape },
  set shape(value){
    this._shape = value
    this._curve = null
  },

  start: function(at){
    at = at || this.context.currentTime

    if (!this.trigger){

      this._curve = null

      if (this.sync && this.context.scheduler && this.context.scheduler.getTimeAt){
        this.scheduleFrom = this.context.scheduler.getTimeAt()
      } else {
        this._scheduledFrom = 0
      }

    }

    this._scheduledTo = at
    this._lastSchedule = at - 0.2
    this._processSchedule()

    clearInterval(this._rescheduler)
    this._rescheduler = setInterval(this._processSchedule, 100)
  },

  stop: function(at){
    at = at || this.context.currentTime
    this._doSchedule(this._scheduledTo, at)
    cancelValues(this._targets, at)
    setValues(this._targets, 0, at)
    // release rescheduler
    clearInterval(this._rescheduler)
  },

  _doSchedule: function(timeFrom, timeTo){
    this._scheduledTo = Math.max(this.context.currentTime, timeFrom)

    while (this._scheduledTo < timeTo) {
      this._scheduledFrom = this._scheduledTo
      setValueCurves(this._targets, this._curve, this._scheduledTo, this._cycleDuration)
      this._scheduledTo += this._cycleDuration
    }
  },

  _refreshComputedRate: function(){
    var value = this._rate
    
    if (this._sync && this.context.scheduler && this.context.scheduler.getTempo){
      value = value * (this.context.scheduler.getTempo() / 60)
    }

    if (this._computedRate != value){
      this._computedRate = value
      this._curve = null
    }
  },

  connect: function(param){
    if (!~this._targets.indexOf(param)){
      extendTransform(param, this.context)
      param.clearTransforms()

      this.value.addTarget(param.transform(param.value))      
      this._targets.push(param.transform(add, 0))
    }
  },

  disconnect: function(){
    cancelValues(this._targets, this.context.currentTime)
    setValues(this._targets, 0, this.context.currentTime)
    this.value.clearTargets()
    this._targets.length = 0
  }

}

function getCurveKey(lfo){
  return '' + lfo._computedRate+ '/' + lfo.amp + '/' + lfo.phaseOffset + '/' + lfo.min + '/' + lfo.max + '/' + lfo.shape
}

function setValueCurves(targets, curve, at, duration){
  for (var i=0;i<targets.length;i++){
    var target = targets[i]
    //target.setValueAtTime(2, at)
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

var curves = []
var curveCache = {}

function getCurve(node){
  var key = getCurveKey(node)

  if (!curveCache[key]){
    curveCache[key] = generateCurve(node)
    curves.push(key)
  }

  return curveCache[key]
}

function generateCurve(node){
  console.log('generating')
  var length = node.context.sampleRate / (Math.max(node._computedRate, 0.1))
  var curve = new Float32Array(length)
  var shape = shapes[node.shape] || shapes['sine']
  for (var i=0;i<length;i++){
    var phase = i / length + node.phaseOffset
    var nextValue = shape(1 + phase) * node.amp
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
    return (t % 1) < 0.5 ? (-1 + n * 4) : (1 - n * 4)
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

function add(a,b){
  return a + b
}

function subtract(a,b){
  return a - b
}

function multiply(a,b){
  return a * b
}