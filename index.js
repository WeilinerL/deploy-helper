// require modules
const fs = require('fs');
const { Client } = require('ssh2');
const archiver = require('archiver');
const { readFileSync } = require('fs');
const path = require('path');

// 执行node脚本的文件夹目录 这里需要为相应的项目的根目录
const cwdPath = process.cwd();
// 读取本工具的默认配置
const configPlainText = readFileSync(path.resolve(__dirname, '.config.json'));
const CONFIG = JSON.parse(configPlainText);


/**
 * 读取项目的发布配置文件
 *
 * @return {*} 
 */
function readConfigFile() {
  const configPlainText = readFileSync(path.resolve(cwdPath, CONFIG.CONFIG_FILE_NAME));
  let config = {};
  try {
    config = JSON.parse(configPlainText);
  } catch(e) {
    throw new SyntaxError(`${CONFIG.CONFIG_FILE_NAME} 文件解析错误`);
  }
  return config;
}


/**
 * 上传文件
 *
 * @param {*} conn
 * @param {*} localPath
 * @param {*} remotePath
 * @param {*} callback
 */
function uploadFile(conn, localPath, remotePath, callback){
  conn.sftp((err, sftp) => {
    if (err) throw err;
    sftp.fastPut(localPath, remotePath, function(err, result) {
      if (err) throw err;
      callback(result)
    });
  })
}


/**
 * 文件压缩
 *
 * @param {*} localPath
 */
async function compress(localPath) {

  // create a file to stream archive data to.
  const outDir = path.resolve(localPath, `${Date.now()}-dist.zip`);
  const output = fs.createWriteStream(outDir);
  const archive = archiver('zip', {
    zlib: { level: 9 } // Sets the compression level.
  });

  // listen for all archive data to be written
  // 'close' event is fired only when a file descriptor is involved
  output.on('close', function() {
    console.log(archive.pointer() + ' total bytes');
    console.log('archiver has been finalized and the output file descriptor has closed.');
  });

  // This event is fired when the data source is drained no matter what was the data source.
  // It is not part of this library but rather from the NodeJS Stream API.
  // @see: https://nodejs.org/api/stream.html#stream_event_end
  output.on('end', function() {
    console.log('Data has been drained');
  });

  // good practice to catch warnings (ie stat failures and other non-blocking errors)
  archive.on('warning', function(err) {
    if (err.code === 'ENOENT') {
      // log warning
    } else {
      // throw error
      throw err;
    }
  });

  // good practice to catch this error explicitly
  archive.on('error', function(err) {
    throw err;
  });

  // pipe archive data to the file
  archive.pipe(output);
  await compressDir(archive, localPath);
  archive.finalize();
  return outDir;
}


/**
 * 压缩文件、文件夹
 *
 * @param {*} archive
 * @param {*} dir
 */
function compressDir(archive, dir) {
  return new Promise((resolve, reject) => {
    fs.stat(dir, (err,data)=>{
      if (err){
        reject(err);
        return console.log(err);
      }
      const filename = path.basename(dir);
      // 如果是文件夹 则压缩该文件夹
      if (data.isDirectory()) {
        archive.directory(dir, filename);
      } else {
        // 否则压缩该文件
        archive.append(fs.createReadStream(dir), { name: filename });
      }
      resolve(true);
    })
  })
}


/**
 * 读取node命令的指定参数
 *
 * @param {*} target
 * @return {*} 
 */
function resolveArgs(...target) {
  let args;
  try {
    args = JSON.parse(process.env.npm_config_argv).original
  } catch(e) {
    throw new Error(e);
  }
  const res = {};
  target.forEach((field) => {
    args.forEach((arg, index) => {
      const keyVals = arg.split('=');
      if (keyVals?.[0] == field) {
        res[field.split('--')[1]] = keyVals[1];
        args.splice(index, 1);
      }
    });
  })
  return res;
}

function main() {
  // 读取node命令的参数 来获取链接远程Linux服务器的用户名和密码
  const args = resolveArgs("--username", "--password");
  // 读取用户的默认配置文件 .deploy.config.json
  const config = readConfigFile();
  const conn = new Client();
  conn.on('ready', () => {
    console.log('Client :: ready');
    compress(path.resolve(cwdPath, config.localPath)).then((outDir) => {
      const filename = path.basename(outDir);
      let p = config.remotePath;
      p = p.replace(/\/+$/, '');
      const remotePath = p + '/' + filename;
      console.log(outDir, remotePath);
      uploadFile(conn, outDir, remotePath, (res) => {
        console.log('上传成功！', res);
        console.log('开始解压文件...');
        conn.shell((err, stream) => {
          if (err) throw err;
          stream.on('close', () => {
            console.log('文件解压完毕！');
            console.log('Stream :: close');
            conn.end();
          }).on('data', (data) => {
            console.log('OUTPUT: ' + data);
          });
          // 进入指定文件夹解压缩文件到当前文件夹
          stream.end(`
            cd ${p}\nunzip ${filename}\nexit\n`
          );
        });
      });
    })
  }).connect({
    readyTimeout: 20000,
    ...config,
    ...args
  });
}

main();