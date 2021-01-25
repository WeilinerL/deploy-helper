# 前端自动部署工具

> 为了解决前端开发中频繁需要将打包后的本地代码发布到个人服务器的相应目录下，以便部署webapp应用的苦恼，浓缩了这款小工具

# 使用方法

## 1. 下载相应的npm包到本地
```
npm install @weilinerl/deploy-helper -D
```

## 2. 在项目的根目录下新建/配置 **.deploy.config.json** 文件

```
{
  "host": "", // 域名或ip地址
  "port": 22, // 默认sftp连接端口号
  "localPath": "./dist", // 需要上传到服务器的本地文件夹目录
  "remotePath": "/root/dist", // 需要上传到目标服务器的文件夹目录，一般为tomcat的webapp目录
  "readyTimeout": 20000 // 默认连接超时时间
}
```

## 3. 在项目的package.json 的scripts中配置相应的启动命令

```
...
 scripts: {
   ...
   "deploy": "deploy-app"
 }
 ...
```
## 4. 开始发布

项目执行打包构建命令后会在根目录生成相应的文件夹，只需要在.deploy.config.json文件中配置好打包后的本地文件的文件夹相对目录localPath，然后执行以下命令即可

```
npm run deploy --username=${你的远程服务器的登录用户名} --password=${你的远程服务器的登录密码}
```

发布完成后会在服务器的remotePath文件夹中生成相应的文件，命名方式为``` `${Date.now()}-dist` ```，
同时在本地配置的localPath文件夹中的生成相应的压缩文件，命名方式同上