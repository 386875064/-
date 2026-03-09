// 适配 uniCloud 官方接口规范（云函数调用模式）
const config = {
  spaceId: 'mp-6c6da90d-be15-4edb-9c42-f2637f4cae34',
  clientId: 'E3PLOw15jxR7YxfI/W4idA==',
  invokeUrl: 'https://api.bspapp.com/v2/uni-cloud/invoke'
};

// 调用 uniCloud 云函数（核心：数据库/存储操作都通过云函数）
function callFunction(name, data) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${config.invokeUrl}/${name}`,
      method: 'POST',
      data: data || {},
      header: {
        'content-type': 'application/json',
        'X-UniCloud-Space-Id': config.spaceId,
        'X-UniCloud-Client-Id': config.clientId
      },
      success: (res) => resolve(res.data),
      fail: (err) => reject(err)
    });
  });
}

// 数据库新增数据（通过云函数调用）
function dbAdd(collection, data) {
  // 调用内置的数据库操作云函数
  return callFunction('db.collection.add', {
    collection: collection,
    data: data
  });
}

// 文件上传（直接调用 uniCloud 上传接口）
function uploadFile(filePath, cloudPath) {
  return new Promise((resolve, reject) => {
    // 开发者工具关闭域名校验后，可临时用阿里云测试域名
    wx.uploadFile({
      url: 'https://upload-bbs.micloud.aliyuncs.com',
      filePath: filePath,
      name: 'file',
      formData: {
        cloudPath: cloudPath,
        spaceId: config.spaceId,
        clientSecret: config.clientId // 注意：上传接口用 clientSecret 而非 clientId
      },
      success: (res) => {
        try {
          const result = JSON.parse(res.data);
          resolve(result);
        } catch (e) {
          resolve(res.data);
        }
      },
      fail: (err) => reject(err)
    });
  });
}

// 导出核心方法
module.exports = {
  db: {
    collection: (name) => ({
      add: (data) => dbAdd(name, data)
    })
  },
  uploadFile: uploadFile,
  callFunction: callFunction
};