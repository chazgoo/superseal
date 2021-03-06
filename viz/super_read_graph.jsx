import React, { Component } from "react";
import axios from "axios";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { scaleLinear } from "d3-scale";
import { max } from "d3-array";
import BaseAlignment from "alignment.js/components/BaseAlignment";
import BaseSequenceBarPlot from "alignment.js/components/BaseSequenceBarPlot";
import Placeholder from "alignment.js/components/Placeholder";
import SequenceAxis from "alignment.js/components/SequenceAxis";
import SiteAxis from "alignment.js/components/SiteAxis";
import Network from "alignment.js/components/Network";
import ScrollBroadcaster from "alignment.js/helpers/ScrollBroadcaster";
import fastaParser from "alignment.js/helpers/fasta";
import computeLabelWidth from "alignment.js/helpers/computeLabelWidth";
import css_grid_format from "alignment.js/helpers/format";
import AxisTop from "alignment.js/components/AxisTop";


function SuperReadGraph(props) {
  const has_sequence_data = props.fasta || props.sequence_data;
  if (!has_sequence_data) return <div />;
  const sequence_data = props.sequence_data || fastaParser(props.fasta),
    data = sequence_data.map(record => {
      return +record.header.split('_')[1].split('-')[1]
    });
  sequence_data.forEach(record => {
    record.header = record.header.split('_')[0];
  });
  const { width, bar_width, height, axis_height, site_size, label_padding } = props,
    label_width = computeLabelWidth(sequence_data, label_padding),
    number_of_sites = sequence_data[0].seq.length,
    number_of_sequences = sequence_data.length,
    full_pixel_width = number_of_sites * site_size,
    full_pixel_height = number_of_sequences * site_size,
    base_alignment_width = (width - bar_width - label_width)/2,
    base_alignment_height = height - axis_height,
    bar_scale = scaleLinear()
      .domain([0, max(data)])
      .range([props.left_bar_padding, bar_width - props.right_bar_padding]),
    node_x_scale = scaleLinear()
      .domain([0, number_of_sites - 1])
      .range([site_size/2, full_pixel_width - site_size/2]),
    node_y_scale = scaleLinear()
      .domain([0, number_of_sequences - 1])
      .range([site_size/2, full_pixel_height - site_size/2]),
    container_style = {
      display: "grid",
      gridTemplateColumns: css_grid_format([
        label_width,
        base_alignment_width,
        base_alignment_width,
        bar_width
      ]),
      gridTemplateRows: css_grid_format([axis_height, base_alignment_height])
    },
    nodes = props.graph.nodes.map((node, i) => {
      if(node.id == "source") {
        return {
          x: site_size / 2,
          y: site_size / 2,
          id: "source",
          fill: "pink",
          stroke: "red"
        };
      } else if(node.id == "target") {
        return {
          x: full_pixel_width - site_size / 2,
          y: full_pixel_height - site_size / 2,
          id: "target",
          fill: "pink",
          stroke: "red"
        };
      } else {
        return {
          x: node_x_scale((node.cv_start + node.cv_end) / 2),
          y: node_y_scale(i-2),
          id: node.id
        };
      }
    }),
    scroll_broadcaster = new ScrollBroadcaster({
      width: full_pixel_width,
      height: full_pixel_height,
      x_pad: base_alignment_width,
      y_pad: base_alignment_height,
      bidirectional: [
        "alignmentjs-alignment",
        "alignmentjs-axis-div",
        "alignmentjs-labels-div",
        "alignmentjs-bar",
        "alignmentjs-network"
      ]
    });
  return (<div id="alignmentjs-main-div" style={container_style}>
    <Placeholder width={label_width} height={axis_height} />
    <Placeholder width={base_alignment_width} height={axis_height} />
    <SiteAxis
      width={base_alignment_width}
      height={axis_height}
      sequence_data={sequence_data}
      scroll_broadcaster={scroll_broadcaster}
    />
    <AxisTop
      width={bar_width}
      height={axis_height}
      scale={bar_scale}
      label="Read weight"
    />
    <SequenceAxis
      width={label_width}
      height={base_alignment_height}
      sequence_data={sequence_data}
      scroll_broadcaster={scroll_broadcaster}
    />
    <Network
      width={base_alignment_width}
      height={base_alignment_height}
      nodes={nodes}
      links={props.graph.links}
      full_width={full_pixel_width}
      full_height={full_pixel_height}
      scroll_broadcaster={scroll_broadcaster}
    />
    <BaseAlignment
      width={base_alignment_width}
      height={base_alignment_height}
      sequence_data={sequence_data}
      scroll_broadcaster={scroll_broadcaster}
    />
    <BaseSequenceBarPlot
      data={data}
      width={bar_width}
      height={base_alignment_height}
      scroll_broadcaster={scroll_broadcaster}
      scale={bar_scale}
    />
  </div>);
}

SuperReadGraph.defaultProps = {
  width: 1200,
  height: 900,
  bar_width: 300,
  label_padding: 10,
  site_size: 20,
  axis_height: 50,
  left_bar_padding: 10,
  right_bar_padding: 20,
}

export default class ReadGraphPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      fasta: null,
      graph: null
    };
  }
  componentDidMount() {
    Promise.all([
      axios.get("/api/restricted.fasta"),
      axios.get("/api/graph.json")
    ]).then(values => {
      this.setState({
        fasta: values[0].data,
        graph: values[1].data
      });
    });
  }
  render() {
    const has_data = this.state.fasta && this.state.graph;
    return(<Row>
      <Col>
        <h1>Super Read Graph</h1>
        {has_data ? <SuperReadGraph {...this.state} /> : null}
      </Col>
    </Row>);
  }
};
