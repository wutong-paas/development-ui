const map = {
  announcement: '公告',
  news: '消息',
  warn: '提醒',
};
const util = {
  getTypecn: type => map[type] || '',
};

export default util;
