import React from "react";

const appStatusMap = {
  running: {
    iconUrl: "/static/www/img/appOutline/appOutline0.png",
    className: "roundloading",
  },
  starting: {
    iconUrl: "/static/www/img/appOutline/appOutline7.png",
    className: "",
  },
  unKnow: {
    iconUrl: "/static/www/img/appOutline/appOutline1.png",
    className: "",
  },
};

export default class Index extends React.Component {
  constructor(props) {
    super(props);
  }
  render() {
    const { status } = this.props;
    const url = appStatusMap[status] ? appStatusMap[status].iconUrl : appStatusMap.unKnow.iconUrl;
    const className = appStatusMap[status]
      ? appStatusMap[status].className
      : appStatusMap.unKnow.className;
    return (
      <img
        style={{
          width: 60,
          height: 60,
          display: "block",
          marginLeft: "auto",
          marginRight: "auto",
        }}
        src={url}
        className={className}
      />
    );
  }
}
