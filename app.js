let model
let videoWidth, videoHeight
let ctx, canvas
let sum = 0
let gesture = 0
let answer = 0
let score = 0
const k = 40
const machine = new kNear(k)
const log = document.querySelector("#array")
const sumText = document.querySelector("#sum")
const gestureText = document.querySelector("#gesture")
const answerText = document.querySelector("#answer")
const scoreText = document.querySelector("#score")
const highscore = document.querySelector("#highscore")
const VIDEO_WIDTH = 720
const VIDEO_HEIGHT = 405

// video fallback
navigator.getUserMedia = navigator.getUserMedia ||navigator.webkitGetUserMedia || navigator.mozGetUserMedia

// array posities van de vingerkootjes
let fingerLookupIndices = {
    thumb: [0, 1, 2, 3, 4],
    indexFinger: [0, 5, 6, 7, 8],
    middleFinger: [0, 9, 10, 11, 12],
    ringFinger: [0, 13, 14, 15, 16],
    pinky: [0, 17, 18, 19, 20]
}


//
// start de applicatie
//
async function main() {
    assignment()
    loadModel()
    buttons()
    highscore.innerHTML = `highscore: ${localStorage.getItem("score")}`
    model = await handpose.load()
    const video = await setupCamera()
    video.play()
    startLandmarkDetection(video)


}

// Laad het model uit de json file
function loadModel(){
    fetch("./model.json")
    .then((response) => response.json())
    .then((model) => modelLoaded(model))
}

// voeg de data toe aan de machine
function modelLoaded(model){
    for(let data of model) {
        machine.learn(data.v, data.lab)
    }
    console.log("model loaded")
    console.log(model)
}

//
// start de webcam
//
async function setupCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
            "Webcam not available"
        )
    }

    const video = document.getElementById("video")
    const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
            facingMode: "user",
            width: VIDEO_WIDTH,
            height: VIDEO_HEIGHT
        }
    })
    video.srcObject = stream

    return new Promise(resolve => {
        video.onloadedmetadata = () => {
            resolve(video)
        }
    })
}

//
// predict de vinger posities in de video stream
//
async function startLandmarkDetection(video) {

    videoWidth = video.videoWidth
    videoHeight = video.videoHeight

    canvas = document.getElementById("output")

    canvas.width = videoWidth
    canvas.height = videoHeight

    ctx = canvas.getContext("2d")

    video.width = videoWidth
    video.height = videoHeight

    ctx.clearRect(0, 0, videoWidth, videoHeight)
    ctx.strokeStyle = "red"
    ctx.fillStyle = "red"

    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1) // video omdraaien omdat webcam in spiegelbeeld is

    predictLandmarks()
}

//
// predict de locatie van de vingers met het model
//
async function predictLandmarks() {
    ctx.drawImage(video,0,0,videoWidth,videoHeight,0,0,canvas.width,canvas.height)
    // prediction!
    const predictions = await model.estimateHands(video)
    if (predictions.length > 0) {
        const result = predictions[0].landmarks
        drawKeypoints(ctx, result, predictions[0].annotations)
        logData(predictions)
    }
    requestAnimationFrame(predictLandmarks)

}

function logData(predictions) {
    let str = []
    for (let i = 0; i < 20; i++) {
        str.push(predictions[0].landmarks[i][0])
        str.push(predictions[0].landmarks[i][1])
    }
    return str
}

//
// teken hand en vingers
//
function drawKeypoints(ctx, keypoints) {
    const keypointsArray = keypoints;

    for (let i = 0; i < keypointsArray.length; i++) {
        const y = keypointsArray[i][0]
        const x = keypointsArray[i][1]
        drawPoint(ctx, x - 2, y - 2, 3)
    }

    const fingers = Object.keys(fingerLookupIndices)
    for (let i = 0; i < fingers.length; i++) {
        const finger = fingers[i]
        const points = fingerLookupIndices[finger].map(idx => keypoints[idx])
        drawPath(ctx, points, false)
    }
}

//
// teken een punt
//
function drawPoint(ctx, y, x, r) {
    ctx.beginPath()
    ctx.arc(x, y, r, 0, 2 * Math.PI)
    ctx.fill()
}
//
// teken een lijn
//
function drawPath(ctx, points, closePath) {
    const region = new Path2D()
    region.moveTo(points[0][0], points[0][1])
    for (let i = 1; i < points.length; i++) {
        const point = points[i]
        region.lineTo(point[0], point[1])
    }

    if (closePath) {
        region.closePath()
    }
    ctx.stroke(region)
}

function buttons(){
    const buttonPredict = document.querySelector("#predict")
    const buttonAssignment = document.querySelector("#assignment")


    buttonPredict.addEventListener("click", async () =>{
        const predictions = await model.estimateHands(video)
        let prediction = machine.classify(logData(predictions))
        if(prediction == gesture){
            console.log("correct")
            score++
            scoreText.innerHTML = `score: ${score}`

            if(localStorage.getItem("score") && localStorage.getItem("score") < score || !localStorage.getItem("score")){
                localStorage.setItem("score", score)
                highscore.innerHTML = `highscore: ${localStorage.getItem("score")}`
            }
            assignment()
           
        }
        else{
            console.log("incorrect, try again") 
        }
    })

    buttonAssignment.addEventListener("click", () => assignment())
}

// save het model door het naar json te vertalen en in de console te plaatsen
function saveModel(){
    console.log(machine.training)
    let model = JSON.stringify(machine.training)
    console.log(model)
}

function Learn(array, name){
    machine.learn(array, name)
    console.log(`${name} learned`)
}

function assignment(){
    sum = Math.floor(Math.random() * 20) + 1
    gesture = Math.floor(Math.random() * 4) + 1
    answer = sum + gesture
    console.log(sum)
    console.log(gesture)
    console.log(answer)
    
    sumText.innerHTML = sum
    answerText.innerHTML = answer
}
//
// start
//
main()