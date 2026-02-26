declare module "react-plotly.js" {
  import { Component } from "react";

  interface PlotParams {
    data: object[];
    layout?: object;
    config?: object;
    style?: React.CSSProperties;
  }

  export default class Plot extends Component<PlotParams> {}
}
