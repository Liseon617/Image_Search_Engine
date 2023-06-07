import "./App.css";
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import * as d3 from "d3";

function App() {

  const SearchResult = [
    { title: "test", value: 100, type: "low", image: null },
    { title: "test", value: 100, type: "low", image: null },
    { title: "test", value: 100, type: "low", image: null },
    { title: "test", value: 500, type: "middle", image: null },
    { title: "test", value: 250, type: "middle", image: null },
    { title: "test", value: 400, type: "middle", image: null },
    { title: "test", value: 300, type: "middle", image: null },
    { title: "test", value: 700, type: "high", image: null },
    { title: "test", value: 800, type: "high", image: null },
    { title: "test", value: 750, type: "high", image: null },
  ];

  const [file, setFile] = useState(null);
  const [result, setResult] = useState([]);
  const [sendFlag, setSendFlag] = useState(false);
  //var result = Array(10).fill();
  function ChangeHandler(event) {
    setFile(event.target.files[0]);
  }
  function SaveHandler() {
    if (file) {
      const formData = new FormData();
      formData.append("image", file);

      axios
        .post("http://localhost:3001/upload", formData)
        .then((res) => {
          setSendFlag(false);
          console.log(res.data);
        })
        .catch((err) => {
          console.error(err);
        });
      axios
        .get("http://localhost:3001/download")
        .then(async (res) => {
          const temp = await res.data;
          setResult(temp);
          if(result){
            console.log(temp);
            console.log("hello5");
            setSendFlag(true);
          }
        })
        .catch((err) => {
          setResult([]);
          setSendFlag(false);
          console.error(err);
        });
    }
  }

  // function handleImageClick(image) {
  //   window.open(image, "_blank");
  // }

  const svgRef = useRef(null);
  const resultRef = useRef(null);
  function GenerateSVG(searchResult, ref) {
    //console.log(sendFlag);
    const width = 460;
    const height = 460;
    useEffect(() => {
      let svg = d3.select(ref.current);

      svg.selectAll("*").remove();

      svg = svg
        .append("svg")
        .attr("id", "search-result")
        .attr("width", width)
        .attr("height", height);

      const colour = d3
        .scaleOrdinal()
        .domain(["high", "low", "middle"])
        .range(["#353745", "#D9D9D9", "00C853"]);

      const size = d3.scaleLinear().domain([0, 2000]).range([7, 100]);

      let node = svg
        .selectAll()
        .data(searchResult)
        .join("svg")
        .attr("class", "search-div")
        // .attr("key", result.length)
        .append("circle")
        .attr("class", "node");

      let imageResult = svg.selectAll(".search-div").append("image");

      const simulation = d3
        .forceSimulation()
        .force(
          "center",
          d3
            .forceCenter(width / 2, height / 2)
            .x(width / 2)
            .y(height / 2)
        )
        .force("charge", d3.forceManyBody().strength(1))
        .force(
          "collide",
          d3
            .forceCollide()
            .strength(0.2)
            .radius(function (d) {
              return size(d.value) + 3;
            })
            .iterations(1)
        );
      simulation
        .nodes(searchResult)
        .on("tick", function (d) {
          node
            .attr("cx", (d) => d.x)
            .attr("cy", (d) => d.y)
            .attr("r", (d) => size(d.value))
            .style("fill", (d) => colour(d.type))
            .style("fill-opacity", 0.8);

          imageResult
            .attr("x", (d) => d.x - size(d.value))
            .attr("y", (d) => d.y - size(d.value))
            .attr("width", (d) => size(d.value) * 2)
            .attr("height", (d) => size(d.value) * 2)
            .attr("xlink:href", (d) => (d.image == null && !sendFlag)? d.image : require("./result/" + d.image))
            // .attr("onclick", handleImageClick(test))
            .style("overflow", "hidden")
            .style("border-radius", "50%")
            .style("object-fit", "cover")
            .style("clip-path", "circle(50% at center)");
        }, []);
    });
  }
  if(sendFlag){
    console.log("flag:" + sendFlag + "1");
    GenerateSVG(result, resultRef);
  } else {
    console.log("flag:" + sendFlag + "2");
    GenerateSVG(SearchResult, svgRef);
  }

  return (
    <div className="App">
      <input title="file" type="file" onChange={ChangeHandler} />
      <button onClick={SaveHandler}>Save Image</button>
      <div>
        {sendFlag ? (
          <div ref={resultRef}></div>
        ) : (
          <div ref={svgRef}></div>
        )}
      </div>
    </div>
  );
}

export default App;
