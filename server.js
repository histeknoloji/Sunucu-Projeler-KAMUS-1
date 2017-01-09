/*===========================================================================
	Packages
===========================================================================*/
var express = require('express');
var path = require('path');
var bodyParser = require('body-parser')
//var async = require("async");
var colors = require('colors');
var gitlog = require('gitlog')
var fs = require("fs")
const spawn = require('child_process').spawn;
process.env.TMPDIR = 'tmp'; // to avoid the EXDEV rename error, see http://stackoverflow.com/q/21071303/76173
var flow = require("@flowjs/flow.js/samples/Node.js/flow-node.js")("tmp")
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();



//var directory = require("./node_modules/directory-tree/lib/directory-tree.js")
/*
var archiver = require("archiver")
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();

var PythonShell = require('python-shell');
var moment = require('moment')
var momenttz = require('moment-timezone')
moment.defineLocale('tr', {
	months : 'Ocak_Şubat_Mart_Nisan_Mayıs_Haziran_Temmuz_Ağustos_Eylül_Ekim_Kasım_Aralık'.split('_'),
});

*/
var MetaInspector = require('node-metainspector')
//--------------------------------------------------------------------------------------------------------------------------------
// MongoDB Driver
//--------------------------------------------------------------------------------------------------------------------------------
var MongoClient = require('mongodb').MongoClient;
var MongoObjectID = require('mongodb').ObjectID;
//var mongodbUrl = 'mongodb://hsyn:03014123@139.59.156.195:27017/kamus';
var mongodbUrl = 'mongodb://127.0.0.1:27017/kamus';

/*===========================================================================
	Prototypes 
===========================================================================*/
String.prototype.padZero= function(len, c){
    var s= '', c= c || '0', len= (len || 2)-this.length;
    while(s.length<len) s+= c;
    return s+this;
}
Number.prototype.padZero= function(len, c){
    return String(this).padZero(len,c);
}	

String.prototype.validateAsPath = function(){
    temp = this
    if(/[/><\n\t:\u0022|?*\\]/.test(temp)){
        if(/[çğıöşüÇĞİÖŞÜ]/.test(temp)){
            temp = temp.replace(/[/]/, " veya ")
            temp = temp.replace(/[>]/, " büyüktür ")
            temp = temp.replace(/[<]/, " küçüktür ")
        }
        else{
            temp = temp.replace(/[/]/, " or ")
            temp = temp.replace(/[>]/, " bigger than ")
            temp = temp.replace(/[<]/, " less than ")
        }
        temp = temp.replace(/[\n]/," ")
        temp = temp.replace(/[\t]/," ")
        temp = temp.replace(/[\:]/,",")
        temp = temp.replace(/[\"]/,"\'")
        temp = temp.replace(/[|]/,",")
        temp = temp.replace(/[?]/,"")
        temp = temp.replace(/[*]/,"x")
        temp = temp.replace(/[\\]/," ")
        temp = temp.replace(/[\/]/," ")
        temp = temp.replace(/[  ]/," ")
    }
    return temp
}

/*===========================================================================
	Helpers 
===========================================================================*/
function docsTrueReleativePath(item){
    if(/[/]/.test(item["path"])){
        // in case full path under KAMUS/docs is supplied
        return "KAMUS/docs/"+item["path"];
    }
    else{
        // in case path under KAMUS/docs/'section'/'subsection'/ is supplied
        // this will be revised later as above
        return "KAMUS/docs/"+item.section+"/"+item.subSection+"/"+item["path"];
    }
}

function docsTrueReleativePath2(item){
    if(/[/]/.test(item["path"])){
        // in case full path under KAMUS/docs is supplied
        return "KAMUS/docs2/"+item["path"];
    }
    else{
        // in case path under KAMUS/docs/'section'/'subsection'/ is supplied
        // this will be revised later as above
        return "KAMUS/docs2/"+item.section+"/"+item.subSection+"/"+item["path"];
    }
}

/*===========================================================================
	Server setup with "Express.js" framework 
===========================================================================*/
//create the app instance
var app = express();

//serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'bower_components')));
app.use(express.static(path.join(__dirname, 'tmp')));
app.use(express.static(path.join(__dirname, 'test')));

//parse POST data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

app.listen(80);	
console.log("Sunucu yeniden başlatıldı.")

/*===========================================================================
	Flow.js 
===========================================================================*/
// Configure access control allow origin header stuff
var ACCESS_CONTROLL_ALLOW_ORIGIN = true;

// Handle uploads through Flow.js
app.post('/upload', multipartMiddleware, function(req, res) {
    flow.post(req, function(status, filename, original_filename, identifier) {
        console.log('POST', status, original_filename, identifier);
        if (ACCESS_CONTROLL_ALLOW_ORIGIN) {
            res.header("Access-Control-Allow-Origin", "*");
        }
        if (status == 'done' ||status == 'partly_done') {
            status = 200;
        }
        res.status(status).send();
    });
});


app.options('/upload', function(req, res){
    console.log('OPTIONS');
    if (ACCESS_CONTROLL_ALLOW_ORIGIN) {
        res.header("Access-Control-Allow-Origin", "*");
    }
    res.status(200).send();
});

// Handle status checks on chunks through Flow.js
app.get('/upload', function(req, res) {
    flow.get(req, function(status, filename, original_filename, identifier) {
        console.log('GET', status);
        if (ACCESS_CONTROLL_ALLOW_ORIGIN) {
            res.header("Access-Control-Allow-Origin", "*");
        }
        if (status == 'found') {
            status = 200;
        } else {
            status = 204;
        }
        res.status(status).send();
    });
});

app.get('/upload/download/:identifier', function(req, res) {
    flow.write(req.params.identifier, res);
});

/*===========================================================================
	MongoDB client access with "mongoskin"
===========================================================================*/
//connect to the mongodb
//var db = require('mongoskin').db("mongodb://localhost/kamus", { w: 0});

/*-----------------------------------------------------------------------------
	Upload file with "Flow.js"
-----------------------------------------------------------------------------*/
process.env.TMPDIR = 'tmp'; // to avoid the EXDEV rename error, see http://stackoverflow.com/q/21071303/76173

// Configure access control allow origin header stuff
var ACCESS_CONTROLL_ALLOW_ORIGIN = true;
/*
// Handle uploads through Flow.js
app.post('/upload', multipartMiddleware, function(req, res) {
	flow.post(req, function(status, filename, original_filename, identifier) {
		console.log('POST', status, original_filename, identifier);
		if (ACCESS_CONTROLL_ALLOW_ORIGIN) {
			res.header("Access-Control-Allow-Origin", "*");
		}
		if (status == 'done' ||status == 'partly_done') {
			status = 200;
		}
		res.status(status).send();
	});
});


app.options('/upload', function(req, res){
	console.log('OPTIONS');
	if (ACCESS_CONTROLL_ALLOW_ORIGIN) {
		res.header("Access-Control-Allow-Origin", "*");
	}
	res.status(200).send();
});

// Handle status checks on chunks through Flow.js
app.get('/upload', function(req, res) {
	flow.get(req, function(status, filename, original_filename, identifier) {
		console.log('GET', status);
		if (ACCESS_CONTROLL_ALLOW_ORIGIN) {
			res.header("Access-Control-Allow-Origin", "*");
		}

		if (status == 'found') {
			status = 200;
		} else {
			status = 204;
		}

		res.status(status).send();
	});
});

app.get('/download', function(req, res) {
	console.log(req.query)
	var file = fs.createWriteStream('tmp/'+req.query.path)
	flow.write(req.query.identifier, file, {onDone:flow.clean});
});
*/

app.post('/raspi', function(req, res){
    console.log("POST: /raspi")
    console.log(req.ip)
    res.send({ip:req.ip})
})

/*===========================================================================
	Kamus - Projeler
===========================================================================*/
app.get('/projeler', function(req, res){
    console.log("GET: /projeler")
    MongoClient.connect(mongodbUrl, function(err, db) {
        db.collection('projeler').find(req.query).toArray(function(err,data){
            res.send(data);
            db.close()
        })
    })		
})

app.get('/projeler/gitlog', function(req, res){
    console.log("GET: /projeler/gitlog")
    var options = {
        repo:'/home/his/Projeler/'+req.query.projeler,
        //number:5,
        fields:['hash','subject','authorDateRel']
    }
    gitlog(options,function(err,commits){
        res.send(commits)
    })
})


//app.post('/project', function(req, res){
//console.log("POST: /project")
//console.log("POST: /project: \n\tbody:"+req.body)
//var item = req.body
/*item.type = "Proje"
    item.finishDate = ""
    item.status = "Faal"
    item.subProjects = []
    db.collection("projects").insert(item, function(err, r){
        if (err) return res.send({ status:"error" });
        res.send({});
    });*/
//});
/*
app.post('/projects/delete', function(req, res){
	console.log("POST: ".yellow,"/projects/delete: ".blue,req.body)
	MongoClient.connect('mongodb://localhost/kamus', function(err, db) {
		db.collection('projects').deleteOne(req.body,function(err,docs){
			res.send({});
			db.close()
		})
	})		
});

app.get("/subProjects",function(req,res){
	db.collection("projects").find(req.query).toArray(function(err, data){
		console.log(req.query)
		console.log(data)
		res.send(data[0].subProjects);
	});
})

app.post("/subProjects",function(req,res){
	MongoClient.connect('mongodb://localhost/kamus', function(err, db) {
		var item = req.body
		item.type = "İş Paketi"
		item.finishDate = ""
		item.status = "Faal"
		db.collection('projects').updateOne({"value":req.body.project},{$push:{"subProjects":item}},null,function(err,docs){
			if (err) return res.send({ status:"error" });
			res.send({});
			db.close()
		})
	})	
})

app.post("/subProjects/delete",function(req,res){
	MongoClient.connect('mongodb://localhost/kamus', function(err, db) {
		if(req.body.subProject){

		}
		console.log(req.body)
		res.send({})
		db.close()
	})	
})
*/
//===========================================================================
// KAMUS - Araçlar - Grafik
//===========================================================================
app.get('/tool/chart/draw', function(req, res){
    console.log("GET: /tool/chart/draw")
    file = "tmp/chart-data-"+String(Date.now())+".txt"
    fs.writeFile(file,req.query.input,function(err){
        if(err){res.send(err)}
        else{
            const python = spawn('python3', ["/home/hsyn/KAMUS/script/chart.py",file,req.query.width,req.query.height]);
            python.stdout.on('data', (data) => {
                console.log("GET: /tool/chart/draw\n\t python-stdout: "+data);
                res.send(String(data).trim())
            });
            python.stderr.on('data', (data) => {
                console.log("GET: /tool/chart/draw\n\t python-stderr: "+data);
            });            
        }
    })
})
/*===========================================================================
	KAMUS - Bağlantılar
===========================================================================*/
app.get('/baglantilar', function(req, res){
    console.log("GET: /baglantilar")
    MongoClient.connect(mongodbUrl, function(err, db) {
        db.collection('baglantilar').find(req.query).toArray(function(err,data){
            for (var i = 0; i < data.length; i++){
                data[i].id = data[i]._id
                delete data[i]._id
                var today = new Date()
                var lastvisit = new Date(data[i].lastvisit)
                data[i].pastvis = data[i].period-((today.getTime()-lastvisit.getTime())/86400000).toFixed(0)
                data[i].no = i+1
            }
            res.send(data);
            db.close()
        })
    })		
});

app.post('/baglantilar', function(req, res){
    console.log("POST: /baglantilar")
    MongoClient.connect(mongodbUrl, function(err, db) {
        db.collection('baglantilar').insertOne(req.body,function(err){
            if (err) return res.send({ status:"error" });
            res.send({});
            db.close()
        })
    })		
});

app.put('/baglantilar/:_id', function(req, res){
    console.log("PUT: /baglantilar")
    MongoClient.connect(mongodbUrl, function(err, db) {
        db.collection('baglantilar').updateOne({_id:MongoObjectID(req.params._id)}, req.body,function(err){
            if (err) return res.send({ status:"error" });
            res.send({});
            db.close()
        })
    })		
});
app.delete('/baglantilar/:_id', function(req, res){
    console.log("DEL: /baglantilar")
    MongoClient.connect(mongodbUrl, function(err, db) {
        db.collection('baglantilar').deleteOne({_id:MongoObjectID(req.params._id)},function(err){
            if (err) return res.send({ status:"error" });
            res.send({});
            db.close()
        })
    })		
});

app.get('/baglantilar/title', function(req, res){
    console.log("GET: /baglantilar/title")
	var client = new MetaInspector(req.query.url, { timeout: 5000 });
	client.on("fetch", function(){
		res.send(client.title);
	});
	client.on("error", function(err){
		res.send("");
		console.log(err)
	});
	client.fetch();
});

//===========================================================================
// KAMUS - Belgeler
//===========================================================================
app.get('/belgeler', function(req, res){	
    console.log("GET: /belgeler")
    MongoClient.connect(mongodbUrl, function(err, db) {
        db.collection('belgeler').find(req.query).toArray(function(err,data){
            res.send(data);
            db.close()
        })
    })
});

/*
app.get('/docs_counter', function(req, res){
	db.collection("counter").find({"collection":"docs"}).toArray(function(err, data){
		res.send((parseInt(data[0].no)+1).padZero(6))
	})
})
app.get('/docs_path_url', function(req, res){
	var item = req.query
	item.files = JSON.parse(item.files);console.log(item.files)
	// item.path
	item.path = "/KAMUS/Belgeler/"+item.section+"/"+item.subSection+"/"+item.no+" "+item.title.validateAsPath()	
	if(item.type=="Dosya"){
		if(item.files[0].type=="Bağlantı") item.path = item.files[0].path
		else item.path = item.path+"."+item.files[0].path.split(".").pop()
			}
	else ; // do nothing
	// item.url
	if(item.type=="Dosya"){
		if(item.files[0].type=="Bağlantı") res.send({"path":item.path,"url":item.files[0].path})
		else{
			var pyshell = new PythonShell('dropbox_move_path.py',{args: [item.path, item.upload_url, item.files[0].path]});
			pyshell.on('message', function (message) {res.send({"path":item.path,"url":message})});
		}
	}
	else{
		if(item.files.length==1){
			var pyshell = new PythonShell('dropbox_move_path.py',{args: [item.path, item.upload_url, item.files[0].path]});
			pyshell.on('message', function (message) {res.send({"path":item.path,"url":message})});
		}
		else{
			var pyshell = new PythonShell('dropbox_create_folder.py',{args: [item.path]});
			pyshell.on('message', function (message) {
				item.files.forEach(function(obj){
					if(obj.type!="Bağlantı"){
						var pyshell2 = new PythonShell('dropbox_move_into_path.py',{args: [item.path, item.upload_url, obj.path, obj.type]});
						pyshell2.on('message', function (message2){
							console.log(message2)
						})
					}
				})
				res.send({"path":item.path,"url":message})
			});
		}
	}
})

app.get('/docs_extract_dirtree', function(req, res){
	var item = req.query
	var pyshell = new PythonShell('dropbox_dirtree.py',{args: [item.no, item.path]});
	pyshell.on('message', function (message) {
		console.log(message)
		JSON.parse(item.files).forEach(function(obj){
			if(obj.type=="Bağlantı"){
				var client = new MetaInspector(obj.path, { timeout: 5000 });
				client.on("fetch", function(){ 
					console.log({"type":obj.type, "value":client.title, "url":obj.path})
					db.collection("docs_dirtree").update({"no":item.no}, {"$push":{"data":{"type":obj.type, "value":client.title, "url":obj.path}}}, function(err){
						if(err) console.log(err)
							})
				});
				client.on("error", function(err){
					console.log(err)
					console.log(obj)
					db.collection("docs_dirtree").update({"no":item.no}, {"$push":{"data":{"type":obj.type, "value":obj.path, "url":obj.path}}}, function(err){
						if(err) console.log(err)
							})
				});
				client.fetch();
			}
		})
	})
	res.send({})
})

app.post('/docs', function(req, res){
	var item = req.body
	item.files = JSON.parse(item.files)
	item.relations = JSON.parse(item.relations)
	item.visitDates = []
	db.collection("docs").insert(item, function(err, r){
		if (err) return res.send({ status:"error" });
		db.collection("counter").update({"collection":"docs"}, {"$set":{"no":item.no}}, function(err){
			if (err) return res.send({ status:"error" });
			res.send({});
		})
	});
});

app.put('/docs/:id', function(req, res){
	db.collection("docs").updateById(req.params.id, req.body, function(err){
		if (err) return res.send({ status:"error" });
		res.send({});
	});
});

app.get('/docs_dirtree', function(req, res){
	db.collection("docs_dirtree").find({"no":req.query.no}).toArray(function(err, data){
		res.send(data[0].data);
	});
});
*/
/*------------------------------------------------------------------
	Kamus - phd
-----------------------------------------------------------------------------*/
/*var nodemailer = require('nodemailer');

// create reusable transporter object using SMTP transport
var transporter = nodemailer.createTransport({
	service: 'Gmail',
	auth: {
		user: 'fenrihen@gmail.com',
		pass: 'Hs4458948'
	}
});


String.prototype.padZero= function(len, c){
	var s= '', c= c || '0', len= (len || 2)-this.length;
	while(s.length<len) s+= c;
	return s+this;
}
Number.prototype.padZero= function(len, c){
	return String(this).padZero(len,c);
}	

app.get('/kamus_phd', function(req, res){	
	db.collection("phd").find({}).toArray(function(err, data){
		for (var i = 0; i < data.length; i++){
			data[i].id = data[i]._id;
			delete data[i]._id;
		}
		res.send(data);
	});
});

app.post('/kamus_phd_addEntry', function(req, res) {
	var item = req.body
	item.files = JSON.parse(item.files)
	item.discussions = JSON.parse(item.discussions)
	//console.log(item)
	db.collection("counter").find({"value":"phd"}).toArray(function(err, data){
		item.no = data[0].no
		var newNo = parseInt(data[0].no)+1 
		db.collection("counter").updateById(data[0]._id, {"value":"phd", "no":newNo.padZero(4)}, function(err){})
		db.collection("phd").insert(item, function(err, r){
			if (err) return res.send({ status:"error" });
		})
		for(var i = 0; i < item.files.length; i++){
			mv("./tmp/"+item.files[i].fileName,"./public/kamus/phd/KAMUS/PhD/"+item.no+"  "+item.folderName+"/"+item.files[i].fileName,{mkdirp:true},function(err){});
		}

		// setup e-mail data with unicode symbols
		var mailOptions = {
			from: 'Doktora Takip Arayüzü <fenrihen@gmail.com>', // sender address
			to: 'gkiziltas@sabanciuniv.edu, yigithuseyin@sabanciuniv.edu', // list of receivers
			subject: 'Yeni Kayıt Eklendi', // Subject line
			text: "\""+item.no+"  "+item.title+"\" etiketli kayıt eklendi.", // plaintext body
			html: '<a href="http://fenrihen.com/kamus/phd">Arayüzü ziyaret et</a>' // html body
		};

		// send mail with defined transport object
		transporter.sendMail(mailOptions, function(error, info){
			if(error){
				return console.log(error);
			}
			console.log('Message sent: ' + info.response);
		});

		res.send({})
	});
});

app.post('/kamus_phd_addDiscussion', function(req, res) {
	var item = req.body
	item.files = JSON.parse(item.files)
	item.entry = JSON.parse(item.entry)
	db.collection("phd").findById(item.entry.id,function(err, query){
		var discussions = [] 
		if(query.hasOwnProperty("discussions")){discussions = query.discussions}
		if(discussions.length){
			item.no = discussions.length+1
		}
		else{
			item.no = 1
		}
		discussions.push(item)
		db.collection("phd").updateById(item.entry.id,{$set:{discussions:discussions}})
		for(var i = 0; i < item.files.length; i++){
			var queryFullFolderName = "./public/kamus/phd/KAMUS/PhD/"+query.no+"  "+query.folderName
			mv("./tmp/"+item.files[i].fileName,queryFullFolderName+"/discussion "+String(item.no)+" files/"+item.files[i].fileName,{mkdirp:true},function(err){});
		}

		// setup e-mail data with unicode symbols
		var mailOptions = {
			from: 'Doktora Takip Arayüzü <fenrihen@gmail.com>', // sender address
			to: 'gkiziltas@sabanciuniv.edu, yigithuseyin@sabanciuniv.edu', // list of receivers
			subject: 'Mevcut Kayda Yeni Tartışma Eklendi', // Subject line
			text: "\""+query.no+"  "+query.title+"\" etiketli kayda tartışma eklendi.", // plaintext body
			html: '<a href="http://fenrihen.com/kamus/phd">Arayüzü ziyaret et</a>' // html body
		};

		// send mail with defined transport object
		transporter.sendMail(mailOptions, function(error, info){
			if(error){
				return console.log(error);
			}
			console.log('Message sent: ' + info.response);
		});
		res.send({})
	})
});
*/
/*===========================================================================
	Kamus - Hatırlatıcı
===========================================================================*/
/*app.get("/reminder",function(req,res){
	db.collection("reminder").find().toArray(function(err, data){
		for (var i = 0; i < data.length; i++){
			data[i].id = data[i]._id;
			delete data[i]._id;
			var addDate = moment.tz(data[i].addDate,"DD-MMMM-YYYY","Europe/Istanbul")
			var today = moment().tz("Europe/Istanbul")
			data[i].pastDays = today.diff(addDate,"days")
		}
		res.send(data);
	});
})

app.post('/reminder', function(req, res){
	var item = req.body
	db.collection('reminder').insert(item, function(err, r){
		if (err) return res.send({ status:"error" });
		db.collection("counter").update({"collection":"reminder"}, {"$inc":{"no":1}}, function(err){})
		res.send({});
	});
});

app.put('/reminder/:id', function(req, res){
	db.collection("reminder").updateById(req.params.id, req.body, function(err){
		if (err) return res.send({ status:"error" });
		res.send({});
	});
});
app.delete('/reminder/:id', function(req, res){
	db.collection("reminder").removeById(req.params.id, function(err){
		if (err) return res.send({ status:"error" });
		res.send({});
	});
});
app.get("/counter/:col",function(req,res){
	console.log(req.params.col)
	db.collection("counter").find({"collection":req.params.col}).toArray(function(err, data){
		res.send({"no":data[0].no})
	})
})



*/
/*===========================================================================
	Dropbox
===========================================================================*/
/*app.get('/dropbox_upload_folder', function(req, res){
	var pyshell = new PythonShell('dropbox_upload_folder.py');
	pyshell.on('message', function (message) {
		res.send({"url":message})
	});
});
app.get('/dropbox_uploaded_files', function(req, res){
	var options = {
		args: [req.query.url]
	};
	var pyshell = new PythonShell('dropbox_uploaded_files.py',options);
	var files = []
	pyshell.on('message', function (message) {
		res.send({"items":message})
	});
});*/
