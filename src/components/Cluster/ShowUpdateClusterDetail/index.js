/* eslint-disable react/no-array-index-key */
import { connect } from 'dva';
import React, { PureComponent } from 'react';
import cloud from '../../../utils/cloud';
// import globalUtil from '../../../utils/global';
import ClusterProgressQuery from '../ClusterProgressQuery';

@connect(({ global }) => ({
  wutongInfo: global.wutongInfo,
  enterprise: global.enterprise
}))
class UpdateClusterDetail extends PureComponent {
  constructor(arg) {
    super(arg);
    this.state = {
      loading: true,
      complete: false,
      steps: []
    };
  }
  componentDidMount() {
    this.loadTaskEvents();
  }
  componentWillUnmount() {
    this.refresh = false;
  }
  refresh = true;
  loadTaskEvents = () => {
    const {
      dispatch,
      eid,
      task,
      selectProvider,
      enterprise,
      wutongInfo
    } = this.props;
    dispatch({
      type: 'cloud/loadTaskEvents',
      payload: {
        enterprise_id: eid,
        taskID: task.taskID
      },
      callback: data => {
        if (data) {
          const { complete, steps } = cloud.showUpdateClusterSteps(data.events);
          // if (complete && steps.length > 0) {
          //   globalUtil.putInstallClusterLog(enterprise, wutongInfo, {
          //     eid,
          //     taskID: task.taskID,
          //     status: steps[steps.length - 1].Status,
          //     message: steps[steps.length - 1].Message,
          //     install_step: 'createK8s',
          //     provider: selectProvider
          //   });
          // }
          this.setState({
            complete,
            loading: false,
            steps
          });
          if (!complete && this.refresh) {
            setTimeout(() => this.loadTaskEvents(), 4000);
          }
        }
      },
      handleError: res => {
        cloud.handleCloudAPIError(res);
        this.setState({ loading: false });
      }
    });
  };

  render() {
    const { title } = this.props;

    return (
      <ClusterProgressQuery
        title={title || 'Kubernetes 集群配置进度查询'}
        msg="配置流程预计耗时10分钟，请耐心等待，若遇到错误请反馈到社区"
        {...this.state}
        {...this.props}
      />
    );
  }
}

export default UpdateClusterDetail;
