require("dotenv").config()
// registrationURL=https://docs.google.com/forms/d/e/**
// attendanceBackupURL=https://docs.google.com/forms/d/e/**
const REGISTRATIONURL = process.env.registrationURL
const ATTENDANCEURL = process.env.attendanceBackupURL

const express = require("express")
const app = express()
const bodyParser = require("body-parser")
const axios = require("axios")
var serveIndex = require("serve-index")


const admin = require("firebase-admin")

let serviceAccount = require("./compec-web-firebase-adminsdk-u5878-aa8961ccf6.json")

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount)
})

let db = admin.firestore()

path = require("path")

const WebSocket = require("ws")
let socket = new WebSocket("ws://connect.websocket.in/compecRD?room_id=1994")

socket.onopen = function(e) {
	console.log("açıldı")
	socket.send("My name is John")
}
console.log("Socket çalışıyor")
socket.onmessage = function(event) {
	console.log(`[message] Data received from server: ${event.data}`)
	// Object.keys(event).forEach(key=>{
	// console.log(event[key]);

	// })
	// console.log()
}

socket.onclose = function(e) {
	console.log("Socket is closed. Reconnect will be attempted.", e.reason)
	socket = new WebSocket(
		"ws://connect.websocket.in/compecRD?room_id=" + String(id)
	)
}

app.use(bodyParser.json())

app.use("/static", express.static("public"))

app.use(
	"/ftp",
	express.static("public"),
	serveIndex("public", {
		icons: true
	})
)

app.get("/", (req, res) => {
	res.json({
		port: PORT,
		developer: "EminDeniz99"
	})
})

// moved to https://github.com/Compec/member-page
// app.get("/UyeBilgi", (req, res) => {
// 	res.sendFile(path.join(__dirname, "member-page.html"))
// })

app.get("/uye", (req, res) => {
	console.log(req.query.no)
	let newNo = ""
	if (req.query.no) {
		let temp = req.query.no
			.replace(" ", "")
			.replace(" ", "")
			.replace(" ", "")
			.replace(" ", "")
			.replace(" ", "")
		let arr = []
		for (i = 0; i < temp.length; i += 2) {
			arr.push(temp.substring(i, i + 2))
		}
		console.log("array", arr)

		arr.reverse()
		console.log("ters", arr)
		arr.forEach(i => {
			newNo += i
		})
		newNo = hexToDec(newNo)
	}
	console.log(newNo)

	socket.send("Yeni Üye RFID: " + newNo)
	socket.send(
		JSON.stringify({
			rfid: newNo
		})
	)

	// ${req.query.no?req.query.no.trim():""}
	res.redirect(
		`${REGISTRATIONURL}/viewform?usp=pp_url&entry.1325691682=${newNo}`
	)
})

app.post("/gs", (req, res) => {
	// serverdan üye numarası 19-0003 gibi geliyor
	console.log(req.body)

	db.collection("19-20-new-members")
		.doc(req.body.memberId)
		.set(req.body)
	db.collection("compecUyeRfidBased")
		.doc(req.body.rfid)
		.set({
			rfid: req.body.rfid,
			no: req.body.memberId,
			ad: req.body.name,
			soyad: req.body.surname,
			bolum: req.body.major,
			sinif: req.body.grade,
			mail: req.body.mail,
			telefon: req.body.phoneNumber,
			katilim: []
		})

	db.collection("public-19-20-new-members")
		.doc(req.body.memberId)
		.set({
			isCantaGiven: req.body.isCantaGiven,
			memberId: req.body.memberId,
			name: req.body.name,
			surname: req.body.surname,
			isMoneyGot: req.body.isMoneyGot,
			phoneNumber: req.body.phoneNumber.substring(7)
		})

	res.send("")
})

app.get("/yoklama", (req, res) => {
	const input = req.query.rfid
	console.log(input)
	let newNo = ""
	if (input) {
		let temp = input
			.replace(" ", "")
			.replace(" ", "")
			.replace(" ", "")
			.replace(" ", "")
			.replace(" ", "")
		let arr = []
		for (i = 0; i < temp.length; i += 2) {
			arr.push(temp.substring(i, i + 2))
		}
		console.log("array", arr)

		arr.reverse()
		console.log("ters", arr)
		arr.forEach(i => {
			newNo += i
		})
		newNo = hexToDec(newNo)
	}
	console.log(newNo)

	// socket.send("Yeni Üye RFID: " + newNo)
	// socket.send(
	// 	JSON.stringify({
	// 		rfid: newNo
	// 	})
	// )

	axios.get(
		`${ATTENDANCEURL}/formResponse?entry.615627702=` +
			newNo +
			"&entry.596938252=" +
			req.query.ders +
			"&submit=Submit"
	)

	db.collection("compecUyeRfidBased")
		.doc(String(newNo))
		.get()
		.then(doc => {
			if (!doc.exists) {
				console.log("No such document!")

				res.send("Kayitsiz")
			} else {
				console.log("Document data:", doc.data())

				db.collection("egitimler")
					.doc("19-20")
					.collection(req.query.ders)
					.doc(String(newNo))
					.set({
						...doc.data(),
						zaman: new Date(),
						katilim: [
							...new Set(
								(doc.data()["katilim"]
									? doc.data()["katilim"]
									: []
								).concat(req.query.ders)
							)
						]
						// info:db.doc('compecUyeRfidBased/' + String(newNo))
					})

				db.collection("compecUyeRfidBased")
					.doc(String(newNo))
					.update({
						katilim: [
							...new Set(
								(doc.data()["katilim"]
									? doc.data()["katilim"]
									: []
								).concat(req.query.ders)
							)
						]
					})
				res.send({
					...doc.data(),
					zaman: new Date(),
					katilim: [
						...new Set(
							(doc.data()["katilim"]
								? doc.data()["katilim"]
								: []
							).concat(req.query.ders)
						)
					]
					// info:db.doc('compecUyeRfidBased/' + String(newNo))
				})

				socket.send(
					JSON.stringify({
						...doc.data()
					})
				)
			}
		})

	// if (input == "372A814B") {
	// 	res.send("Kullanıcı Kayıtsız")
	// } else {
	// 	res.send("OK")
	// }
	// ${req.query.no?req.query.no.trim():""}
})

app.get("/nodemcu", (req, res) => {
	const input = req.query.rfid
	console.log(input)
	let newNo = ""
	if (input) {
		let temp = input
			.replace(" ", "")
			.replace(" ", "")
			.replace(" ", "")
			.replace(" ", "")
			.replace(" ", "")
		let arr = []
		for (i = 0; i < temp.length; i += 2) {
			arr.push(temp.substring(i, i + 2))
		}
		console.log("array", arr)

		arr.reverse()
		console.log("ters", arr)
		arr.forEach(i => {
			newNo += i
		})
		newNo = hexToDec(newNo)
	}
	console.log(newNo)

	// socket.send("Yeni Üye RFID: " + newNo)
	socket.send(
		JSON.stringify({
			rfid: newNo
		})
	)

	if (input == "372A814B") {
		res.send("Kullanıcı Kayıtsız")
	} else {
		res.send("OK")
	}
	// ${req.query.no?req.query.no.trim():""}
})

const hexToDec = no => {
	const dic = {
		"0": 0,
		"1": 1,
		"2": 2,
		"3": 3,
		"4": 4,
		"5": 5,
		"6": 6,
		"7": 7,
		"8": 8,
		"9": 9,
		A: 10,
		B: 11,
		C: 12,
		D: 13,
		E: 14,
		F: 15
	}
	let mult = 1
	let ans = 0
	for (i = no.length - 1; i > -1; i--) {
		console.log("cevap", ans, dic[no.charAt(i)], typeof dic[no.charAt(i)])
		ans += mult * Number(dic[no.charAt(i)])
		mult *= 16
	}
	return ans
}

app.get("/test", (req, res) => {
	let id = req.query.id
	let rfidid = req.query.rfidid
	res.redirect(
		`${REGISTRATIONURL}?usp=pp_url&entry.1428567309=${rfidid}&entry.1037233682=${id}`
	)
	console.log("teeest")
	res.send("gg")
})

const PORT = normalizePort(process.env.PORT || "4000")

function normalizePort(val) {
	var port = parseInt(val, 10)

	if (isNaN(port)) {
		// named pipe
		return val
	}

	if (port >= 0) {
		// port number
		return port
	}

	return false
}

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`)
})

// emin deniz - this app has been developed while I have just been learning node.js , september 2019
