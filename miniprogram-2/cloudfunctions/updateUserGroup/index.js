const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { userId, groupName } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    // 校验是不是管理员
    const adminRes = await db.collection('admins').where({ openid }).get()
    if (adminRes.data.length === 0) {
      return { success: false, errMsg: '非管理员无法修改' }
    }

    // 直接修改别人的小组
    await db.collection('users').doc(userId).update({
      data: { groupName }
    })

    return { success: true, errMsg: '修改成功' }
  } catch (err) {
    return { success: false, errMsg: '修改失败：' + err.message }
  }
}