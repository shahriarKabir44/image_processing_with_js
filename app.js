function getel(x) {
    return document.getElementById(x)
}


var copydat = null


const fileinput = document.getElementById('fileinput')

const canvas = document.getElementById('canvas')

const ctx = canvas.getContext('2d')

const red = document.getElementById('red')
const green = document.getElementById('green')
const blue = document.getElementById('blue')
const brightness = document.getElementById('brightness')
const grayscale = document.getElementById('grayscale')
const contrast = document.getElementById('contrast')

red.onchange = runPipeline
green.onchange = runPipeline
blue.onchange = runPipeline
brightness.onchange = runPipeline
grayscale.onchange = runPipeline
contrast.onchange = runPipeline

const srcImage = new Image()

let imgData = null
let originalPixels = null
let currentPixels = null


fileinput.onchange = function (e) {

    if (e.target.files && e.target.files.item(0)) {

        srcImage.src = URL.createObjectURL(e.target.files[0])
    }
}

srcImage.onload = function () {

    canvas.width = srcImage.width
    canvas.height = srcImage.height

    ctx.drawImage(srcImage, 0, 0, srcImage.width, srcImage.height)

    imgData = ctx.getImageData(0, 0, srcImage.width, srcImage.height)
    copydat = ctx.getImageData(0, 0, srcImage.width, srcImage.height)
    originalPixels = imgData.data.slice()
}

function commitChanges() {

    for (let i = 0; i < imgData.data.length; i++) {
        imgData.data[i] = currentPixels[i]
    }
    ctx.putImageData(imgData, 0, 0, 0, 0, srcImage.width, srcImage.height)
}

function runPipeline() {

    currentPixels = originalPixels.slice()

    const brightnessFilter = Number(brightness.value)
    const contrastFilter = Number(contrast.value)
    const redFilter = Number(red.value)
    const greenFilter = Number(green.value)
    const blueFilter = Number(blue.value)

    const grayscaleFilter = grayscale.checked
    for (let i = 0; i < srcImage.width; i++) {
        for (let j = 0; j < srcImage.height; j++) {


            if (grayscaleFilter) {
                setGrayscale(i, j)
            }

            addBrightness(i, j, brightnessFilter)
            addContrast(i, j, contrastFilter)

            if (!grayscaleFilter) {
                addRed(i, j, redFilter)
                addGreen(i, j, greenFilter)
                addBlue(i, j, blueFilter)
            }
        }
    }

    commitChanges()
}

const R_OFFSET = 0
const G_OFFSET = 1
const B_OFFSET = 2

function addRed(x, y, value) {
    const index = getIndex(x, y) + R_OFFSET
    const currentValue = currentPixels[index]
    currentPixels[index] = clamp(currentValue + value)
}

function addGreen(x, y, value) {
    const index = getIndex(x, y) + G_OFFSET
    const currentValue = currentPixels[index]
    currentPixels[index] = clamp(currentValue + value)
}

function addBlue(x, y, value) {
    const index = getIndex(x, y) + B_OFFSET
    const currentValue = currentPixels[index]
    currentPixels[index] = clamp(currentValue + value)
}

function addBrightness(x, y, value) {
    addRed(x, y, value)
    addGreen(x, y, value)
    addBlue(x, y, value)
}

function setGrayscale(x, y) {
    const redIndex = getIndex(x, y) + R_OFFSET
    const greenIndex = getIndex(x, y) + G_OFFSET
    const blueIndex = getIndex(x, y) + B_OFFSET

    const redValue = currentPixels[redIndex]
    const greenValue = currentPixels[greenIndex]
    const blueValue = currentPixels[blueIndex]

    const mean = (redValue + greenValue + blueValue) / 3

    currentPixels[redIndex] = clamp(mean)
    currentPixels[greenIndex] = clamp(mean)
    currentPixels[blueIndex] = clamp(mean)
}

function addContrast(x, y, value) {
    const redIndex = getIndex(x, y) + R_OFFSET
    const greenIndex = getIndex(x, y) + G_OFFSET
    const blueIndex = getIndex(x, y) + B_OFFSET

    const redValue = currentPixels[redIndex]
    const greenValue = currentPixels[greenIndex]
    const blueValue = currentPixels[blueIndex]
    const alpha = (value + 255) / 255

    const nextRed = alpha * (redValue - 128) + 128
    const nextGreen = alpha * (greenValue - 128) + 128
    const nextBlue = alpha * (blueValue - 128) + 128

    currentPixels[redIndex] = clamp(nextRed)
    currentPixels[greenIndex] = clamp(nextGreen)
    currentPixels[blueIndex] = clamp(nextBlue)
}

function getIndex(x, y) {
    return (x + y * srcImage.width) * 4
}

function clamp(value) {
    return Math.max(0, Math.min(Math.floor(value), 255))
}


function reset() {
    for (let n = 0; n < copydat.data.length; n++) {
        imgData.data[n] = copydat.data[n];
    }


    ctx.putImageData(imgData, 0, 0, 0, 0, imgData.width, imgData.height)

}

var threshold = 2;

function avgpx(x, y) {
    var a = imgData.data[getIndex(x, y)]
    var b = imgData.data[getIndex(x, y) + 1]
    var c = imgData.data[getIndex(x, y) + 2]
    return Math.floor((a + b + c) / 3)
}

function findEdge() {
    reset()
    threshold = getel('edg').value * 1
    for (let n = 1; n < imgData.width - 1; n++) {
        for (let k = 1; k < imgData.height - 1; k++) {
            var av1 = avgpx(n, k)
            var av2 = avgpx(n - 1, k)
            var av3 = avgpx(n, k + 1)
            if (Math.abs(av1 - av2) <= threshold || Math.abs(av1 - av3) <= threshold) {
                imgData.data[getIndex(n, k)] = 255
                imgData.data[getIndex(n, k) + 1] = 255
                imgData.data[getIndex(n, k) + 2] = 255
            }
            else {
                imgData.data[getIndex(n, k)] = 0
                imgData.data[getIndex(n, k) + 1] = 0
                imgData.data[getIndex(n, k) + 2] = 0
            }
        }
    }
    ctx.putImageData(imgData, 0, 0, 0, 0, srcImage.width, srcImage.height)

}

var kernel = 5

function blurReg(x, y, kernel) {
    var tot = 0
    var tot1 = 0
    var tot2 = 0
    for (let n = x; n < Math.min(imgData.width, x + kernel); n++) {
        for (let k = y; k < Math.min(imgData.height, y + kernel); k++) {
            tot += imgData.data[getIndex(n, k)]
            tot1 += imgData.data[getIndex(n, k) + 1]
            tot2 += imgData.data[getIndex(n, k) + 2]
        }
    }
    tot /= (kernel * kernel)
    tot1 /= (kernel * kernel)
    tot2 /= (kernel * kernel)
    for (let n = x; n < Math.min(imgData.width, x + kernel); n++) {
        for (let k = y; k < Math.min(imgData.height, y + kernel); k++) {
            imgData.data[getIndex(n, k)] = Math.floor(tot)
            imgData.data[getIndex(n, k) + 1] = Math.floor(tot1)
            imgData.data[getIndex(n, k) + 2] = Math.floor(tot2)
        }
    }
}

function blurx() {
    reset()
    kernel = getel('blr').value * 1
    kernel += (1 & !(kernel & 1))
    for (let n = 0; n < imgData.width; n++) {
        for (let k = 0; k < imgData.height; k++) {
            blurReg(n, k, kernel)
        }
    }
    ctx.putImageData(imgData, 0, 0, 0, 0, srcImage.width, srcImage.height)

}

