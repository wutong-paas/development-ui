/* eslint-disable react/sort-comp */
/* eslint-disable react/no-array-index-key */
/* eslint-disable eqeqeq */
/* eslint-disable no-nested-ternary */
/* eslint-disable react/no-string-refs */
import { Button, Card, Cascader, Form, Input, Select } from 'antd';
import { connect } from 'dva';
import React, { Fragment, PureComponent } from 'react';
import Ansi from '../../components/Ansi/index';
import NoPermTip from '../../components/NoPermTip';
import { getContainerLog, getServiceLog } from '../../services/app';
import appUtil from '../../utils/app';
import globalUtil from '../../utils/global';
import HistoryLog from './component/Log/history';
import History1000Log from './component/Log/history1000';
import styles from './Log.less';

const { Option } = Select;

@connect(
  ({ user }) => ({
    currUser: user.currentUser
  }),
  null,
  null,
  { withRef: true }
)
export default class Index extends PureComponent {
  logRef = React.createRef();
  constructor(arg) {
    super(arg);
    this.state = {
      containerLog: [],
      logs: [],
      instances: [],
      started: true,
      showHistoryLog: false,
      showHistory1000Log: false,
      showHighlighted: '',
      filter: '',
      pod_name: '',
      container_name: '',
      refreshValue: 5,
      isAutoScroll: true, //添加一个标识用来控制日志的自动滚动
      isStopMouseMoveEvent: false //当日志信息不推送时 阻止鼠标移入事件
    };
  }
  componentDidMount() {
    if (!this.canView()) return;
    this.loadLog();
    this.fetchInstanceInfo();
  }
  componentDidUpdate(prevProps, prevState) {
    if (this.state.isAutoScroll && this.state.started) {
      if (this.logRef.current) {
        this.logRef.current.scrollIntoView({
          behavior: 'smooth'
        });
      }
    }
  }
  componentWillUnmount() {
    if (this.props.socket) {
      this.props.socket.closeLogMessage();
    }
  }
  shouldComponentUpdate(nextProps, nextStae) {
    const { status } = this.props;
    //防止多余渲染
    if (nextProps.status.status === status.status && this.state === nextStae) {
      return false;
    }
    return true;
  }
  fetchInstanceInfo = () => {
    const { dispatch, appAlias } = this.props;
    dispatch({
      type: 'appControl/fetchPods',
      payload: {
        team_name: globalUtil.getCurrTeamName(),
        app_alias: appAlias
      },
      callback: res => {
        let list = [];
        if (res && res.list) {
          const new_pods =
            (res.list.new_pods &&
              res.list.new_pods.length &&
              res.list.new_pods) ||
            [];
          const old_pods =
            (res.list.old_pods &&
              res.list.old_pods.length &&
              res.list.old_pods) ||
            [];
          list = [...new_pods, ...old_pods];
        }
        if (list && list.length > 0) {
          list.map(item => {
            item.name = `实例：${item.pod_name}`;
            item.container.map(items => {
              items.name = `容器：${items.container_name}`;
            });
          });
        }
        list.push({
          name: '全部日志'
        });
        this.setState({
          instances: list
        });
      }
    });
  };
  onFinish = value => {
    this.setState({ filter: value }, () => {
      const { logs, pod_name: podName } = this.state;
      if (value === '') {
        if (podName) {
          this.fetchContainerLog();
        } else {
          this.fetchServiceLog();
        }
      } else {
        this.setLogs(logs);
      }
    });
  };
  setLogs = logs => {
    const { filter, pod_name: podName } = this.state;
    let newlogs = logs;
    newlogs = logs.filter(item => {
      if (filter == '' || item.indexOf(filter) != -1) {
        return true;
      }
      return false;
    });
    newlogs = newlogs.map(item => {
      if (item.indexOf(filter) != -1) {
        const newitem = item.replace(filter, `\x1b[33m${filter}\x1b[0m`);
        return newitem;
      }
      return item;
    });
    if (newlogs.length > 5000) {
      newlogs = newlogs.slice(logs.length - 5000, logs.length);
    }
    const upDataInfo = podName ? { containerLog: newlogs } : { logs: newlogs };
    this.setState(upDataInfo);
  };
  watchLog() {
    if (this.props.socket) {
      this.props.socket.setOnLogMessage(
        messages => {
          if (messages && messages.length > 0) {
            const logs = this.state.logs || [];
            const newlogs = logs.concat(messages);
            this.setLogs(newlogs);
          }
          this.setState({
            isStopMouseMoveEvent: messages.length === 0
          });
        },
        messages => {
          if (this.state.started) {
            let logs = this.state.logs || this.state.containerLog || [];
            logs = logs.concat(messages);
            this.setLogs(logs);
          }
          this.setState({
            isStopMouseMoveEvent: messages.length === 0
          });
        }
      );
    }
  }
  loadLog() {
    const { logs } = this.state;
    if (logs.length == 0) {
      this.fetchServiceLog();
    } else {
      this.watchLog();
    }
  }
  fetchServiceLog = () => {
    getServiceLog({
      team_name: globalUtil.getCurrTeamName(),
      app_alias: this.props.appAlias
    }).then(data => {
      if (data) {
        this.setState({ logs: data.list || [] });
        this.watchLog();
      }
    });
  };
  hanleTimer = () => {
    const { refreshValue } = this.state;
    this.closeTimer();
    if (!refreshValue) {
      return null;
    }
    this.timer = setTimeout(() => {
      this.fetchContainerLog();
    }, refreshValue * 1000);
  };

  closeTimer = () => {
    if (this.timer) {
      clearInterval(this.timer);
    }
  };

  fetchContainerLog = () => {
    const { pod_name, container_name } = this.state;
    getContainerLog({
      team_name: globalUtil.getCurrTeamName(),
      app_alias: this.props.appAlias,
      pod_name,
      container_name
    }).then(data => {
      if (
        data &&
        data.status_code &&
        data.status_code === 200 &&
        data.response_data
      ) {
        const arr = data.response_data.split('\n');
        console.log('coming');
        this.setState(
          {
            containerLog: arr || []
          },
          () => {
            this.hanleTimer();
          }
        );
      }
    });
  };

  canView() {
    return appUtil.canManageAppLog(this.props.appDetail);
  }
  handleStop = () => {
    this.setState({ started: false });
    if (this.props.socket) {
      this.props.socket.closeLogMessage();
    }
  };
  handleStart = () => {
    this.setState({ started: true });
    this.watchLog();
  };
  showDownHistoryLog = () => {
    this.setState({ showHistoryLog: true });
  };
  hideDownHistoryLog = () => {
    this.setState({ showHistoryLog: false });
  };
  showDownHistory1000Log = () => {
    this.setState({ showHistory1000Log: true });
  };
  hideDownHistory1000Log = () => {
    this.setState({ showHistory1000Log: false });
  };
  onChangeCascader = value => {
    if (value && value.length > 1) {
      this.setState(
        {
          pod_name: value[0].slice(3),
          container_name: value[1].slice(3)
        },
        () => {
          if (!this.props.socket) this.fetchContainerLog();
        }
      );
    } else {
      this.setState(
        {
          pod_name: '',
          container_name: '',
          containerLog: []
        },
        () => {
          this.closeTimer();
          this.fetchServiceLog();
        }
      );
    }
  };
  handleChange = value => {
    this.setState({
      refreshValue: value
    });
    if (!value) {
      this.closeTimer();
    }
  };

  render() {
    if (!this.canView()) return <NoPermTip />;
    const { appAlias } = this.props;
    const {
      logs,
      pod_name,
      containerLog,
      showHighlighted,
      instances,
      started,
      refreshValue,
      showHistoryLog,
      showHistory1000Log,
      isStopMouseMoveEvent
    } = this.state;
    return (
      <Card
        onMouseEnter={() => {
          this.setState({ isAutoScroll: true });
        }}
        onMouseLeave={() => {
          if (isStopMouseMoveEvent) {
            return;
          }
          this.setState({ isAutoScroll: false });
        }}
        title={
          <Fragment>
            {started ? (
              <Button onClick={this.handleStop}>暂停推送</Button>
            ) : (
              <Button onClick={this.handleStart}>开始推送</Button>
            )}
          </Fragment>
        }
        extra={
          <Fragment>
            <a onClick={this.showDownHistoryLog} style={{ marginRight: 10 }}>
              历史日志下载
            </a>
            <a onClick={this.showDownHistory1000Log}>最近1000条日志</a>
          </Fragment>
        }
        className={styles.card}
      >
        <Form layout="inline" name="logFilter" style={{ marginBottom: '16px' }}>
          <Form.Item
            name="filter"
            label="过滤文本"
            style={{ marginRight: '10px' }}
          >
            <Input.Search
              style={{ width: '300px' }}
              placeholder="请输入过滤文本"
              onSearch={this.onFinish}
            />
          </Form.Item>
          <Form.Item
            name="container"
            label="容器"
            style={{ marginRight: '10px' }}
            className={styles.podCascader}
          >
            <Cascader
              defaultValue={['全部日志']}
              fieldNames={{
                label: 'name',
                value: 'name',
                children: 'container'
              }}
              options={instances}
              onChange={this.onChangeCascader}
              placeholder="请选择容器"
            />
          </Form.Item>

          {pod_name && (
            <Form.Item
              name="refresh"
              label="自动刷新"
              style={{ marginRight: '0' }}
            >
              <Select
                value={refreshValue}
                onChange={this.handleChange}
                style={{ width: 130 }}
              >
                <Option value={5}>5秒</Option>
                <Option value={10}>10秒</Option>
                <Option value={30}>30秒</Option>
                <Option value={0}>关闭</Option>
              </Select>
            </Form.Item>
          )}
        </Form>
        <div
          className={styles.logsss}
          onMouseEnter={() => {
            this.setState({ isAutoScroll: false });
          }}
          onMouseLeave={() => {
            if (isStopMouseMoveEvent) {
              return;
            }
            this.setState({ isAutoScroll: true });
          }}
        >
          {(containerLog &&
            containerLog.length > 0 &&
            containerLog.map((item, index) => {
              return (
                <>
                  <div key={index}>
                    <span
                      style={{
                        color: '#666666'
                      }}
                    >
                      <span>{index + 1}</span>
                    </span>
                    <span
                      ref="texts"
                      style={{
                        width: '100%',
                        color: '#FFF'
                      }}
                    >
                      <Ansi>{item}</Ansi>
                    </span>
                  </div>
                  <div ref={this.logRef} />
                </>
              );
            })) ||
            (logs &&
              logs.length > 0 &&
              logs.map((log, index) => {
                return (
                  <>
                    <div ref={this.logRef} />
                    <div key={index}>
                      <span
                        style={{
                          color:
                            showHighlighted ==
                            log.substring(0, log.indexOf(':'))
                              ? '#FFFF91'
                              : '#666666'
                        }}
                      >
                        <span>{log == '' ? '' : `${index + 1}`}</span>
                      </span>
                      <span
                        ref="texts"
                        style={{
                          color:
                            showHighlighted ==
                            log.substring(0, log.indexOf(':'))
                              ? '#FFFF91'
                              : '#FFF'
                        }}
                      >
                        <Ansi>
                          {log.substring(log.indexOf(':') + 1, log.length)}
                        </Ansi>
                      </span>

                      {logs.length == 1 ? (
                        <span
                          style={{
                            color:
                              showHighlighted ==
                              log.substring(0, log.indexOf(':'))
                                ? '#FFFF91'
                                : '#bbb',
                            cursor: 'pointer',
                            backgroundColor: log.substring(0, log.indexOf(':'))
                              ? '#666'
                              : ''
                          }}
                          onClick={() => {
                            this.setState({
                              showHighlighted:
                                showHighlighted ==
                                log.substring(0, log.indexOf(':'))
                                  ? ''
                                  : log.substring(0, log.indexOf(':'))
                            });
                          }}
                        >
                          <Ansi>{log.substring(0, log.indexOf(':'))}</Ansi>
                        </span>
                      ) : logs.length > 1 &&
                        index >= 1 &&
                        log.substring(0, log.indexOf(':')) ==
                          logs[index <= 0 ? index + 1 : index - 1].substring(
                            0,
                            logs[index <= 0 ? index + 1 : index - 1].indexOf(
                              ':'
                            )
                          ) ? (
                        ''
                      ) : (
                        <span
                          style={{
                            color:
                              showHighlighted ==
                              log.substring(0, log.indexOf(':'))
                                ? '#FFFF91'
                                : '#bbb',
                            cursor: 'pointer',
                            backgroundColor:
                              index == 0 && log.substring(0, log.indexOf(':'))
                                ? '#666'
                                : log.substring(0, log.indexOf(':')) ==
                                  logs[
                                    index <= 0 ? index + 1 : index - 1
                                  ].substring(
                                    0,
                                    logs[
                                      index <= 0 ? index + 1 : index - 1
                                    ].indexOf(':')
                                  )
                                ? ''
                                : '#666'
                          }}
                          onClick={() => {
                            this.setState({
                              showHighlighted:
                                showHighlighted ==
                                log.substring(0, log.indexOf(':'))
                                  ? ''
                                  : log.substring(0, log.indexOf(':'))
                            });
                          }}
                        >
                          <Ansi>{log.substring(0, log.indexOf(':'))}</Ansi>
                        </span>
                      )}
                    </div>
                  </>
                );
              }))}
        </div>
        {showHistoryLog && (
          <HistoryLog onCancel={this.hideDownHistoryLog} appAlias={appAlias} />
        )}
        {showHistory1000Log && (
          <History1000Log
            onCancel={this.hideDownHistory1000Log}
            appAlias={appAlias}
          />
        )}
      </Card>
    );
  }
}
