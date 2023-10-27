const express = require('express');
const cookieParser = require('cookie-parser');
const sessions = require('express-session');
const bodyParser = require('body-parser');
const https = require('https');
const fs = require('fs');
const multiparty = require('multiparty');
const fes = require('fs-extra');
const app = express();
// 中间件函数，用于控制访问
const restrictAccess = (req, res, next) => {
  const allowedReferer = 'https://172.29.150.176:8080/login.html';
  const referer = req.get('Referer'); // 获取请求的来源页面

  if (referer !== allowedReferer) {
    // 如果请求的来源页面不是允许的页面，返回错误或重定向
    return res.status(403).send('Access Denied');
  }

  // 如果是允许的页面访问，继续下一步
  next();
};

// 使用中间件控制路由
app.use('/restricted', restrictAccess);
port = 8080;
var path = require('path');
const { time } = require('console');
const options = {
  key: fs.readFileSync('./public/ssl/localhost.key'), // 指向你的私钥文件
  cert: fs.readFileSync('./public/ssl/localhost.crt')    // 指向你的证书文件
};
https.createServer(options, app).listen(port, () => console.log(`App listening on port ${port}!`));

global.code = 0;
app.use(express.static(path.join(__dirname,'public')))
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json())

// Serve the HTML form
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname,'public/login.html'));
});


app.post('/login', (req, res) => {
  const username = req.body.username;
  const token = req.body.password;
  const code = req.body.code;

  getPwdByUsername(username, (err, password) => {
    if (err) {
      console.error('Error:', err);
    } else if (password) {
      // console.log("数据库查的密码："+password)
      if(password === token){
        if(code === global.code){
          res.sendFile(path.join(__dirname,'public/home.html'));
        }
        else{
          res.send('验证码错误');
        }
      }else{
        res.send('密码错误');
      }
    } else {
      console.log('User not found.');
    }
  });
});

app.get('/code', (req, res) => {
  const username = req.query.username;
  getMailByUsername(username, (err, mail) =>{
    if(err){
      console.error("Error", err);
    }
    else if(mail){
      global.code =  Math.floor(1000 + Math.random() * 9000).toString();
      sendVerificationCodeEmail(mail, global.code);
      res.json({ message: 'Code send successfully' });

    }
    else{
      console.log('User not found.');
      res.send("该用户未注册");
    }
  })
});

app.post('/api/getFileList', (req, res) => {
  const downloadPath = path.join(__dirname, 'public/upload'); // 获取 download 文件夹的绝对路径

  // 使用 fs 模块读取 download 文件夹下的文件列表
  fs.readdir(downloadPath, (err, files) => {
    if (err) {
      console.error('读取文件列表失败', err);
      return res.status(500).json({ error: '读取文件列表失败' });
    }

    // 遍历文件列表并获取文件名和大小
    const fileList = files.map((fileName) => {
      const filePath = path.join(downloadPath, fileName);
      const stats = fs.statSync(filePath);
      return {
        name: fileName,
        size: stats.size,
      };
    });
    res.json(fileList);
  });
});

app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = `./public/download/${filename}`; // 文件的路径

  if (fs.existsSync(filePath)) {
     // 使用 keep-alive 头来指示长连接
     res.setHeader('Connection', 'keep-alive');
     const blockSize = 4096; // 4KB
     const fileStream = fs.createReadStream(filePath, { highWaterMark: blockSize });
 
     res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
     res.setHeader('Content-Type', 'application/octet-stream');
     fileStream.on('data', (chunk) => {
       res.write(chunk);
     });
 
     // 监听文件流结束事件
     fileStream.on('end', () => {
       // 结束响应
       res.end();
     });
  } else {
    // 文件不存在
    res.status(404).send('File not found');
  }
});


const UPLOAD_DIR = path.resolve(__dirname, 'public/upload');
app.post('/upload', function(req, res){
  const form = new multiparty.Form({uploadDir:'temp'});
  form.parse(req);
  form.on('file',async (name, chunk)=>{
    console.log(name);
    console.log(chunk.size)
    console.log(typeof chunk);
    console.log(chunk);
    //存放切片的目录
    let chunkDir = `${UPLOAD_DIR}/${chunk.originalFilename.split('.')[0]}`
    if(!fes.existsSync(chunkDir)){
      await fes.mkdirs(chunkDir);
    }
    //源文件名 index.ext
    var dPath = path.join(chunkDir, chunk.originalFilename.split('.')[1]);
    await fes.move(chunk.path, dPath, {overwrite:true});
    res.send('文件上传成功');
  })
})
app.post('/merge', async function(req, res){
  let name = req.body.name;
  let fname =  name.split('.')[0];

  let chunkDir = path.join(UPLOAD_DIR, fname);
  let chunks =  await fes.readdir(chunkDir);

  chunks.sort((a,b) => a-b).map(chunkPath=>{
    //合并文件
    fs.appendFileSync(
      path.join(UPLOAD_DIR, name),
      fs.readFileSync(`${chunkDir}/${chunkPath}`)
    )
  })
  fes.removeSync(chunkDir);
  res.send({msg:'合并成功'});
})
function getPwdByUsername(username, callback) {
  const mysql = require('mysql');

  const connection = mysql.createConnection({
    host: 'localhost',
    user: 'admin',
    password: 'H!2ni#n^',
    database: 'filetrans',
  });

  connection.connect((err) => {
    if (err) {
      console.error('Error connecting to the database: ' + err.message);
      return;
    }
    // console.log('Connected to the MySQL database');

    const query = 'SELECT pwd FROM user WHERE uname = ? ';
    connection.query(query, [username], (err, results) => {
      if (err) {
        console.log("错误："+err);
        callback(err, null);
      } else if (results.length > 0) {
        // console.log(results);
        // console.log(results[0].pwd);
        callback(null, results[0].pwd);
      } else {
        console.log(results);
        callback(null, null); // User not found
      }

      // Close the database connection
      connection.end();
    });
  });
}

function getMailByUsername(username, callback) {
  const mysql = require('mysql');

  const connection = mysql.createConnection({
    host: 'localhost',
    user: 'admin',
    password: 'H!2ni#n^',
    database: 'filetrans',
  });

  connection.connect((err) => {
    if (err) {
      console.error('Error connecting to the database: ' + err.message);
      return;
    }
    console.log('Connected to the MySQL database');

    const query = 'SELECT mail FROM user WHERE uname = ? ';
    connection.query(query, [username], (err, results) => {
      if (err) {
        console.log("错误："+err);
        callback(err, null);
      } else if (results.length > 0) {
        console.log(results);
        console.log(results[0].mail);
        callback(null, results[0].mail);
      } else {
        console.log(results);
        callback(null, null); // User not found
      }
      // Close the database connection
      connection.end();
    });
  });
}

const nodemailer = require('nodemailer');
const { fileURLToPath } = require('url');
const { url } = require('inspector');
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'QQ', // 使用 Gmail 作为邮件服务提供商
    auth: {
      user: '1433376288@qq.com', // 发件人邮箱地址
      pass: 'jwmgjibxgrtogccb', // 发件人邮箱密码或应用程序密码
    },
  });
};
const sendVerificationCodeEmail = (recipientEmail, verificationCode) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: '1433376288@qq.com', // 发件人邮箱地址
    to: recipientEmail, // 收件人邮箱地址
    subject: '验证码邮件', // 电子邮件主题
    text: `您的验证码是: ${verificationCode}`, // 邮件内容
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('邮件发送失败: ' + error);
    } else {
      console.log('邮件已发送: ' + info.response);
    }
  });
};

// app.listen(port, () => {
//   console.log(`Server is running on http://localhost:${port}`);
// });
