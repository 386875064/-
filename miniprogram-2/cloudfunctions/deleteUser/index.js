// cloudfunctions/deleteUser/index.js
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    // 校验管理员身份
    const wxContext = cloud.getWXContext()
    const callerOpenid = wxContext.OPENID
    const adminRes = await db.collection('admins').where({
      openid: callerOpenid
    }).get()

    if (adminRes.data.length === 0) {
      return {
        success: false,
        errMsg: '非管理员，无权限删除用户'
      }
    }

    // 校验参数
    if (!event.userId) {
      return {
        success: false,
        errMsg: '用户ID不能为空'
      }
    }

    // 执行删除
    await db.collection('users').doc(event.userId).remove()

    return {
      success: true,
      errMsg: '用户删除成功'
    }
  } catch (err) {
    console.error('删除用户云函数错误：', err)
    return {
      success: false,
      errMsg: '删除失败：' + err.errMsg
    }
  }
}