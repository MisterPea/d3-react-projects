import * as React from 'react';
import { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import anscombeData from './data/anscombeQuartetData.json';
import './style/anscombe.scss';

interface AnscombeQuartetProps {
  parentRef: React.RefObject<HTMLDivElement>;
}

interface AnscombeData {
  id: number,
  dataset: string;
  x: number;
  y: number;
}

type LineType = { x: any, y: any; };

export default function AnscombeQuartet({ parentRef }: AnscombeQuartetProps) {
  const quartetWrap = useRef<HTMLDivElement>(null);
  const [boxWidth, setBoxWidth] = useState<number>(0);
  const [boxHeight, setBoxHeight] = useState<number>(0);
  const margin = { top: 10, right: 20, bottom: 25, left: 25 };

  useEffect(() => {
    if (parentRef.current && quartetWrap.current) {
      setBoxWidth(parentRef.current.clientWidth * 0.45);
      setBoxHeight(Math.ceil(parentRef.current.clientWidth * 0.8) * 0.33);
    }
  }, []);

  useEffect(() => {
    if (boxWidth > 0) {
      const container = document.createElement('div');
      container.classList.add('anscombe-main-div');
      quartetWrap.current?.appendChild(container);

      const classNames = [
        { name: 'box-one', dSet: 'I' },
        { name: 'box-two', dSet: 'II' },
        { name: 'box-three', dSet: 'III' },
        { name: 'box-four', dSet: 'IV' },
      ];
      const svgs = classNames.map(({ dSet }) => makeChart(dSet));
      svgs.forEach((elem) => container.appendChild(elem as Node));
    }
  }, [boxWidth, anscombeData]);

  function makeChart(dataset: string) {
    const data = anscombeData.filter((quad: AnscombeData) => quad.dataset === dataset);
    const lineData = [];
    const { m, b } = linearRegression(data);
    for (let x = 1; x < 21; x += 1) {
      const y = m * x + b;
      lineData.push({ x, y });
    }

    const yScale = d3
      .scaleLinear()
      .domain([0, 13])
      .range([boxHeight - margin.bottom, margin.top]);

    const xScale = d3
      .scaleLinear()
      .domain([0, 20])
      .range([margin.left, boxWidth - margin.right]);

    const scaledData = data.map((d: { x: d3.NumberValue; y: d3.NumberValue; }) => ({
      x: xScale(d.x),
      y: yScale(d.y),
    }));

    const svg = d3.create('svg')
      .attr('viewBox', [0, 0, boxWidth, boxHeight])
      .attr('class', `${dataset}-box box`)
      .style('display', 'block');

    svg
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${boxHeight - margin.bottom})`)
      .call(d3.axisBottom(xScale));

    svg
      .append('g')
      .attr('class', 'y-axis')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale).ticks(6));

    const regLine = d3
      .line<LineType>()
      .x((d) => xScale(d.x))
      .y((d) => yScale(d.y));

    svg.selectAll('.regress-line').remove(); // remove line before redraw
    svg
      .append('path')
      .datum(lineData)
      .attr('fill', 'none')
      .attr('class', 'regress-line')
      .attr('stroke', '#ff7300')
      .attr('d', regLine);

    svg
      .selectAll('circle')
      .data(scaledData)
      .join('circle')
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y)
      .attr('r', boxHeight / 100)
      .attr('fill', '#202020')
      .attr('stroke', '#202020');

    return svg.node();
  }

  function linearRegression(data: any[]) {
    const n = data.length;
    const sumX = data.reduce((prev: number, curr: { x: number; }) => prev + +curr.x, 0);
    const sumY = data.reduce((prev: number, curr: { y: number; }) => prev + +curr.y, 0);
    const sumXY = data.reduce((prev: number, curr: { x: number; y: number; }) => prev + +curr.x * +curr.y, 0);
    const sumXsq = data.reduce((prev: number, curr: { x: number; }) => prev + +curr.x * +curr.x, 0);
    const m = (n * sumXY - sumX * sumY) / (n * sumXsq - sumX * sumX);
    const b = (sumY - m * sumX) / n;
    return { m, b };
  }

  return (
    <div ref={quartetWrap} />
  );
}
