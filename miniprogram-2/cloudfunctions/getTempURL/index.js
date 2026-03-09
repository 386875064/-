// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init()

// 云函数入口函数
exports.main = async (event, context) => {
  const { fileList } = event; // 接收前端传的文件ID列表
  try {
    // 获取临时链接，有效期设为1年（31536000秒）
    const result = await cloud.getTempFileURL({
      fileList: fileList,
      maxAge: 31536000 
    });
    return result.fileList; // 返回临时链接列表
  } catch (err) {
    return err; // 出错返回错误信息
  }
};