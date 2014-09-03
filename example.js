var audioContext = new AudioContext()

var LFO = require('./index')
var Clock = require('bopper')

audioContext.scheduler = Clock(audioContext)

var lfo = LFO(audioContext)
lfo.shape = 'sawtooth_i'
var gain = audioContext.createGain()

//var modulator = LFO(audioContext)
//modulator.rate = 1
//modulator.amp = 1
//modulator.value.value = 10

lfo.min = 0

audioContext.scheduler.setTempo(120)
audioContext.scheduler.start()

lfo.connect(gain.gain)
gain.connect(audioContext.destination)
//modulator.connect(lfo.value)


var tempoSlider = addSliderHandler('tempo', 120, 1, 60, 180, function(value){
  audioContext.scheduler.setTempo(value)
})

addSlider('rate', lfo.rate, 0.001, 0.001, 10)
addSlider('amp', lfo.amp, 0.001, 0, 10)

var shapePicker = document.createElement('select')
shapePicker.innerHTML = '<option>sine</option><option>triangle</option><option>sawtooth</option><option>sawtooth_i</option><option>square</option>'
shapePicker.onchange = function(){
  lfo.shape = this.value
}
document.body.appendChild(shapePicker)

addValueCheckbox(lfo, 'sync')

addButton('start', function(){
  var osc = audioContext.createOscillator()
  osc.connect(gain)

  lfo.start(audioContext.currentTime)
  osc.start(audioContext.currentTime)
  //modulator.start(audioContext.currentTime+0.1)

})

var releaseHold = null

addButton('trigger hold', function(){
  var osc = audioContext.createOscillator()
  osc.connect(gain)
  
  lfo.start(audioContext.currentTime)
  osc.start(audioContext.currentTime)
  //modulator.start(audioContext.currentTime)

  releaseHold = function(){
    osc.stop(audioContext.currentTime)
    lfo.stop(audioContext.currentTime)
    //modulator.stop(audioContext.currentTime)
  }

}, function(){
  releaseHold()
})

function addButton(name, down, up){
  var button = document.createElement('button')
  button.onmousedown = down
  button.onmouseup = up
  button.textContent = name
  document.body.appendChild(button)
}

function addSliderHandler(property, defaultValue, step, min, max, onchange){
  var container = document.createElement('div')
  container.appendChild(document.createTextNode(property))
  var label = document.createTextNode(defaultValue)
  var slider = document.createElement('input')
  slider.type = 'range'
  slider.min = min
  slider.max = max
  slider.value = defaultValue

  slider.style.width = '300px'

  if (step){
    slider.step = step
  }

  slider.oninput = function(){
    label.data = this.value
    onchange&&onchange(parseInt(this.value))
  }

  container.appendChild(slider)
  container.appendChild(label)
  document.body.appendChild(container)
  return slider
}

function addValueSlider(node, property, step, min, max){
  var container = document.createElement('div')
  container.appendChild(document.createTextNode(property))
  var label = document.createTextNode(node[property])
  var slider = document.createElement('input')
  slider.type = 'range'
  slider.min = min
  slider.max = max
  slider.value = node[property]

  slider.style.width = '300px'

  if (step){
    slider.step = step
  }

  slider.oninput = function(){
    label.data = this.value
    node[property] = parseFloat(this.value)
  }
  container.appendChild(slider)
  container.appendChild(label)
  document.body.appendChild(container)
}

function addSlider(name, param, step, min, max){
  var container = document.createElement('div')
  container.appendChild(document.createTextNode(name))
  var label = document.createTextNode(param.value)
  var slider = document.createElement('input')
  slider.type = 'range'

  var min = min != null ? min : (param.minValue || 0)
  var max = max != null ? max : (param.maxValue || 100)

  var range = max - min

  slider.min = min
  slider.max = max
  slider.step = step || (range / 100)

  slider.value = param.value
  slider.style.width = '300px'


  slider.oninput = function(){
    label.data = this.value
    param.value = parseFloat(this.value)
  }
  container.appendChild(slider)
  container.appendChild(label)
  document.body.appendChild(container)
}

function addValueCheckbox(node, property){
  var container = document.createElement('div')
  container.appendChild(document.createTextNode(property))
  var label = document.createTextNode(node[property])
  var checkbox = document.createElement('input')
  checkbox.type = 'checkbox'
  checkbox.checked = node[property]


  checkbox.onchange = function(){
    label.data = this.checked
    node[property] = this.checked
  }
  container.appendChild(checkbox)
  container.appendChild(label)
  document.body.appendChild(container)
}