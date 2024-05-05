import * as React from 'react';
import * as d3 from 'd3';
import { useRef, useEffect, useState } from 'react';
import './style/mtaRidership.scss';
import mtaData from './data/mtaRiders.json';
import infoData from './data/mtaRidersTags.json';

interface MtaRidershipProps {
  parentRef: React.RefObject<HTMLDivElement>;
}

type ScaleType = {
  xScale: d3.ScaleTime<number, number, never> | undefined,
  subwayY: d3.ScaleLinear<number, number, never> | undefined,
  xBand: d3.ScaleBand<string> | undefined;
};

export default function MtaRidership({ parentRef }: MtaRidershipProps) {
  const mainRef = useRef<HTMLDivElement>(null);
  const checkboxesRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [currentYear, setCurrentYear] = useState(['2020', '2021', '2022']);
  const [showInfo, setShowInfo] = useState<boolean>(true);
  const margin = { top: 50, right: 10, bottom: 25, left: 35 };

  useEffect(() => {
    if (parentRef.current) {
      setWidth(parentRef.current.clientWidth);
      setHeight(parentRef.current.clientWidth * 0.618);
    }
  }, []);

  const scale: ScaleType = {
    xScale: undefined,
    subwayY: undefined,
    xBand: undefined,
  };

  function convertTimeStamp(array: any[]) {
    const yearData = array.filter(({ date }: { date: string; }) => currentYear.includes(String(new Date(date).getFullYear())));
    yearData.forEach((d: { date: string; }, i: number) => {
      const dateIso = d3.isoParse(d.date);
      if (dateIso !== null) yearData[i].date = dateIso as unknown as string;
    });
    yearData.sort((a: { date: string | number | Date; }, b: { date: string | number | Date; }) => (new Date(a.date).getTime() - new Date(b.date).getTime()));
    return yearData;
  }

  useEffect(() => {
    const yearDataRidership = convertTimeStamp(mtaData);
    const riderTags = convertTimeStamp(infoData);

    if (width > 0) {
      scale.xScale = d3
        .scaleTime()
        .domain([yearDataRidership[0].date, yearDataRidership[yearDataRidership.length - 1].date as any])
        .range([margin.left, width - margin.right]);

      scale.subwayY = d3
        .scaleLinear()
        .domain([0, 5500000]) // instead of looking for max for every year, it's more interesting to look at it in relation to pre-pandemic
        .range([height - margin.bottom, margin.top]);

      scale.xBand = d3
        .scaleBand()
        .domain([...yearDataRidership])
        .range([margin.left, width - margin.right]);

      drawGraph(yearDataRidership, riderTags);
    }
  }, [width, currentYear]);

  /* *********************************** Axes *********************************** */
  function xAxis(svgSelection: any) {
    if (scale.xScale) {
      d3.selectAll('.x-axis').remove();
      svgSelection.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(scale.xScale).tickFormat(d3.timeFormat('%b 20%y') as any));
    }
  }
  function yAxis(svgSelection: any) {
    if (scale.subwayY) {
      d3.selectAll('.y-axis').remove();
      svgSelection.append('g')
        .attr('class', 'y-axis')
        .attr('transform', `translate(${margin.left},0)`)
        .call(d3.axisLeft(scale.subwayY)
          .tickFormat((d, i) => (i % 2 === 0 ? d3.format('~s')(d) : '')));
    }
  }

  /* ********************************* Draw Graph ******************************** */
  function drawGraph(yearData: any[], riderTags: any[]) {
    if (scale.subwayY && scale.xBand && scale.xScale) {
      let svg: any = d3.select(mainRef.current).select('svg');
      if (svg.empty()) {
        svg = d3.select(mainRef.current)
          .append('svg')
          .attr('viewBox', [0, 0, width, height])
          .style('display', 'block');
      } else {
        svg.attr('viewBox', [0, 0, width, height]);
      }

      svg.selectAll('.sub-bar').remove();
      svg.selectAll('rect')
        .data(yearData)
        .join('rect')
        .attr('x', (d: { date: string; }) => scale.xScale!(+d.date))
        .attr('width', scale.xBand.bandwidth())
        .attr('class', ({ date }: { date: string; }) => {
          // We're coloring weekends green
          const dateDay = new Date(date).getDay();
          if (dateDay === 6 || dateDay === 0) {
            return 'sub-bar weekend';
          }
          return 'sub-bar';
        })
        .attr('y', (d: { subways_total_estimated_ridership: string; }) => scale.subwayY!(+d.subways_total_estimated_ridership))
        .attr('height', (d: { subways_total_estimated_ridership: string; }) => scale.subwayY!(0) - scale.subwayY!(+d.subways_total_estimated_ridership))
        .on('mouseenter', (_: any, d: any) => onRollover(d))
        .on('mouseleave', () => onRollOut())
        .on('mousemove', (e: any) => updateMousePosition(e));

      svg.call(xAxis);
      svg.call(yAxis);
      createInfoBox(svg);

      // Info Tag Lines
      d3.selectAll('.overlay-line-group').remove();
      svg.append('g')
        .attr('class', 'overlay-line-group')
        .selectAll('line')
        .data(riderTags)
        .join('line')
        .attr('x1', (d: { date: string; value: number; }) => scale.xScale!(+d.date))
        .attr('x2', (d: { date: string; value: number; }) => scale.xScale!(+d.date))
        .attr('y1', (d: { y: number; }) => scale.subwayY!(d.y) - 2)
        .attr('y2', (d: { length: number; }) => scale.subwayY!(d.length))
        .attr('r', 5)
        .attr('stroke', '#202020')
        .attr('stroke-width', 0.5)
        .attr('class', 'overlay-line');

      // Info Tag Text
      d3.selectAll('.overlay-line-text-group').remove();
      svg.append('g')
        .attr('class', 'overlay-line-text-group')
        .selectAll('text')
        .data(riderTags)
        .join('text')
        .attr('x', (d: { date: string; value: number; }) => scale.xScale!(+d.date))
        .attr('y', (d: { y: number, length: number; }) => scale.subwayY!(d.length) - 2)
        .attr('text-anchor', (d: { justify: string; }) => d.justify)
        .attr('fill', '#303030')
        .text((d: { message: string; }) => d.message)
        .attr('class', 'overlay-text');
    }
  }

  /* ********************************* Info Box ******************************** */
  function createInfoBox(selection: any) {
    d3.selectAll('.info-box-group').remove();
    const infoGroup = selection.append('svg').attr('class', 'info-box-group');

    infoGroup
      .append('rect')
      .attr('height', 32)
      .attr('width', 96)
      .attr('fill', 'white')
      .attr('class', 'info-box')
      .attr('rx', 2.5)
      .attr('stroke', '#40404050');

    infoGroup
      .append('text')
      .attr('class', 'info-box-text info-text')
      .attr('transform', 'translate(0,5)')
      .attr('text-anchor', 'middle')
      .attr('fill', 'red')
      .attr('width', 96)
      .attr('x', 48)
      .attr('y', 10);

    infoGroup
      .append('text')
      .attr('class', 'info-box-text-two info-text')
      .attr('transform', 'translate(0,5)')
      .attr('text-anchor', 'middle')
      .attr('fill', 'black')
      .attr('width', 96)
      .attr('x', 48)
      .attr('y', 22);
  }

  function onRollover(data: any) {
    const currDate = d3.timeFormat('%a %x')(data.date);
    const numRiders = d3.format('.3s')(data.subways_total_estimated_ridership);
    d3.select('.info-box-text').text(`${numRiders} Riders`);
    d3.select('.info-box-text-two').text(`${currDate}`);

    const rollover = document.querySelector('.info-box-group');
    if (!rollover?.classList.contains('active')) {
      rollover?.classList.add('active');
    }
  }

  function onRollOut() {
    document.querySelector('.info-box-group')?.classList.remove('active');
  }

  function updateMousePosition(e: { offsetX: number; offsetY: number; }) {
    d3
      .select('.info-box-group')
      .attr('x', Math.min(e.offsetX - 42, width - 92))
      .attr('y', Math.max(e.offsetY - 40, 0));
  }

  function handleCheckboxClick() {
    if (checkboxesRef.current) {
      const checkboxes = Array.from(checkboxesRef.current.querySelectorAll('input'));
      const currentlyChecked = checkboxes.map((box) => box.checked && box.name).filter(Boolean);
      if (currentlyChecked.length > 0) {
        setCurrentYear(currentlyChecked as string[]);
      }
    }
  }

  function handleInfoToggle() {
    setShowInfo((s) => !s);
  }

  return (
    <div className="mta-ridership">
      <div className={`mta_ridership-chart${showInfo ? ' show-info' : ''}`} ref={mainRef} />
      <div
        className="mta_ridership-input"
        ref={checkboxesRef}
      >
        <div className="mta_ridership-input-group">
          <label htmlFor="year2020">
            <input type="checkbox" tabIndex={0} onChange={handleCheckboxClick} id="year2020" name="2020" checked={currentYear.includes('2020')} />
            2020
          </label>
        </div>
        <div className="mta_ridership-input-group">

          <label htmlFor="year2021">
            <input type="checkbox" tabIndex={0} onChange={handleCheckboxClick} id="year2021" name="2021" checked={currentYear.includes('2021')} />
            2021
          </label>
        </div>
        <div className="mta_ridership-input-group">
          <label htmlFor="year2022">
            <input type="checkbox" tabIndex={0} onChange={handleCheckboxClick} id="year2022" name="2022" checked={currentYear.includes('2022')} />
            2022
          </label>
        </div>
      </div>
      <div className="show-info-wrapper">
        <label htmlFor="show-info">
          <input type="checkbox" tabIndex={0} onChange={handleInfoToggle} id="show-info" name="show-info" checked={showInfo} />
          Show Chart Info
        </label>
      </div>
    </div>
  );
}
