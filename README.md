# 前端自动部署工具

# 使用方法

## 1. 下载相应的npm包到本地项目文件夹
```
npm install deploy-helper
```

## 2. 在项目的根目录下配置 **.deploy.config.json** 文件

```
{
  "host": "", // 域名或ip地址
  "port": 22, // 默认sftp链接端口号
  "localPath": "./dist", // 需要上传到服务器的本地文件夹目录
  "remotePath": "/root/dist", // 需要上传到目标服务器的文件夹目录，一般为Tomcat的webapp目录
  "readyTimeout": 20000 // 默认连接超时时间
}
```

## 3. 在项目的package.json中配置相应的启动命令

```
 // 待完善...
```