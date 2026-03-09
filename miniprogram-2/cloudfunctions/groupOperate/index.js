const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  console.log('云函数接收参数：', event); // 打印参数，方便排查
  try {
    const { action, groupName, groupId } = event;

    // 新增小组
    if (action === 'add') {
      if (!groupName) {
        return { success: false, msg: '小组名称不能为空' };
      }
      const newGroupId = 'group' + Date.now();
      await db.collection('groups').add({
        data: { groupId: newGroupId, groupName, managerOpenid: '' }
      });
      return { success: true, msg: '新增成功', groupId: newGroupId };
    }

    // 删除小组
    if (action === 'delete') {
      if (!groupId) {
        return { success: false, msg: '小组ID不能为空' };
      }
      await db.collection('groups').where({ groupId }).remove();
      return { success: true, msg: '删除成功' };
    }

    // 默认返回
    return { success: false, msg: `无效的action：${action}` };
  } catch (err) {
    console.error('云函数执行出错：', err);
    return { success: false, msg: '云函数出错：' + err.message };
  }
}