// cloudfunctions/updateUserNickname/index.js
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    // 1. 获取调用者openid
    const wxContext = cloud.getWXContext()
    const callerOpenid = wxContext.OPENID

    // 2. 校验是否是管理员（检查admins集合）
    const adminRes = await db.collection('admins').where({
      openid: callerOpenid
    }).get()

    if (adminRes.data.length === 0) {
      return {
        success: false,
        errMsg: '非管理员，无权限修改用户昵称'
      }
    }

    // 3. 校验参数
    if (!event.userId || !event.newNickname) {
      return {
        success: false,
        errMsg: '用户ID和新昵称不能为空'
      }
    }

    // 4. 执行修改（云函数拥有管理员权限，可修改所有用户）
    await db.collection('users').doc(event.userId).update({
      data: {
        nickname: event.newNickname.trim(),
        updateTime: db.serverDate()
      }
    })

    return {
      success: true,
      errMsg: '昵称修改成功'
    }
  } catch (err) {
    console.error('修改昵称云函数错误：', err)
    return {
      success: false,
      errMsg: '修改失败：' + err.errMsg
    }
  }
}