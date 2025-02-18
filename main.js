let data = [];
let selectedGenders = new Set(["male", "female"]);
let genderLookup = {};

// Load subject-info.csv first
d3.csv("subject-info.csv")
  .then((subjectData) => {
    subjectData.forEach((d) => {
      if (d.ID !== undefined && d.ID !== null) {
        let trimmedID = String(d.ID).trim();
        let trimmedSex = String(d.Sex).trim();

        if (trimmedSex === "1") {
          genderLookup[trimmedID] = "female";
        } else if (trimmedSex === "0") {
          genderLookup[trimmedID] = "male";
        }
      }
    });

    return d3.csv("test_measure.csv");
  })
  .then((rawData) => {
    data = rawData
      .map((d) => {
        let trimmedID = String(d.ID).trim();
        let VO2Value = +d.VO2;
        let gender = genderLookup[trimmedID];

        VO2Value = VO2Value / 100;

        return {
          VO2: VO2Value,
          gender: gender || "unknown",
        };
      })
      .filter((d) => d.VO2 >= 0 && d.VO2 <= 80);

    createHistogram();
  })
  .catch((error) => console.error("Error loading CSV:", error));

function createHistogram() {
  d3.select("#chart").selectAll("*").remove();

  const width = 960,
    height = 500,
    margin = { top: 20, right: 20, bottom: 60, left: 60 };

  let tooltip = d3.select("body").select(".tooltip");
  if (tooltip.empty()) {
    tooltip = d3.select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("background-color", "white")
      .style("border", "1px solid #ddd")
      .style("border-radius", "3px")
      .style("padding", "8px")
      .style("pointer-events", "none");
  }

  const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const histogram = d3.bin()
    .value((d) => d.VO2)
    .thresholds(30);

  const binsMale = histogram(data.filter((d) => d.gender === "male"));
  const binsFemale = histogram(data.filter((d) => d.gender === "female"));

  function updateChart() {
    svg.selectAll(".bar, .axis").remove();

    let maxY = 0;
    let minX = Infinity;
    let maxX = -Infinity;

    if (selectedGenders.has("male")) {
      maxY = Math.max(maxY, d3.max(binsMale, (d) => d.length));
      minX = Math.min(minX, d3.min(binsMale, (d) => d.x0));
      maxX = Math.max(maxX, d3.max(binsMale, (d) => d.x1));
    }
    if (selectedGenders.has("female")) {
      maxY = Math.max(maxY, d3.max(binsFemale, (d) => d.length));
      minX = Math.min(minX, d3.min(binsFemale, (d) => d.x0));
      maxX = Math.max(maxX, d3.max(binsFemale, (d) => d.x1));
    }

    if (!selectedGenders.size) {
      minX = 0;
      maxX = 60;
      maxY = 1;
    }

    const x = d3.scaleLinear()
      .domain([minX, maxX])
      .nice()
      .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
      .domain([0, maxY])
      .nice()
      .range([height - margin.bottom, margin.top]);

    histogram.domain(x.domain());

    const updatedBinsMale = histogram(data.filter((d) => d.gender === "male"));
    const updatedBinsFemale = histogram(data.filter((d) => d.gender === "female"));

    const xAxis = svg.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${height - margin.bottom})`);

    xAxis.transition()
      .duration(500)
      .call(d3.axisBottom(x))
      .selection()
      .append("text")
      .attr("x", width / 2)
      .attr("y", 40)
      .attr("fill", "#000")
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text("VO2 Levels (ml/kg/min)");

    const yAxis = svg.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(${margin.left},0)`);

    yAxis.transition()
      .duration(500)
      .call(d3.axisLeft(y))
      .selection()
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -45)
      .attr("fill", "#000")
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text("Frequency / Count");

    if (selectedGenders.has("male")) {
      svg.append("g")
        .selectAll("rect")
        .data(updatedBinsMale)
        .join("rect")
        .attr("class", "bar bar-male")
        .attr("x", (d) => x(d.x0) + 1)
        .attr("width", (d) => Math.max(0, x(d.x1) - x(d.x0) - 1))
        .attr("y", height - margin.bottom)
        .attr("height", 0)
        .transition()
        .duration(500)
        .attr("y", (d) => y(d.length))
        .attr("height", (d) => y(0) - y(d.length));

      // Add hover effects for male bars
      svg.selectAll(".bar-male")
        .on("mouseover", function (event, d) {
          tooltip.transition().duration(200).style("opacity", 0.9);
          tooltip.html(`
            <strong>Male</strong><br/>
            Range: ${d.x0.toFixed(1)} - ${d.x1.toFixed(1)}<br/>
            Count: ${d.length.toLocaleString()}
          `)
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px");
        })
        .on("mouseout", function () {
          tooltip.transition().duration(500).style("opacity", 0);
        });
    }

    if (selectedGenders.has("female")) {
      svg.append("g")
        .selectAll("rect")
        .data(updatedBinsFemale)
        .join("rect")
        .attr("class", "bar bar-female")
        .attr("x", (d) => x(d.x0) + 1)
        .attr("width", (d) => Math.max(0, x(d.x1) - x(d.x0) - 1))
        .attr("y", height - margin.bottom)
        .attr("height", 0)
        .transition()
        .duration(500)
        .attr("y", (d) => y(d.length))
        .attr("height", (d) => y(0) - y(d.length));

      // Add hover effects for female bars
      svg.selectAll(".bar-female")
        .on("mouseover", function (event, d) {
          tooltip.transition().duration(200).style("opacity", 0.9);
          tooltip.html(`
            <strong>Female</strong><br/>
            Range: ${d.x0.toFixed(1)} - ${d.x1.toFixed(1)}<br/>
            Count: ${d.length.toLocaleString()}
          `)
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px");
        })
        .on("mouseout", function () {
          tooltip.transition().duration(500).style("opacity", 0);
        });
    }
  }

  // Button event handlers
  d3.select("#maleButton").on("click", function () {
    toggleFilter("male", this);
  });

  d3.select("#femaleButton").on("click", function () {
    toggleFilter("female", this);
  });

  function toggleFilter(gender, button) {
    if (selectedGenders.has(gender)) {
      selectedGenders.delete(gender);
      button.classList.remove("active");
    } else {
      selectedGenders.add(gender);
      button.classList.add("active");
    }
    updateChart();
  }

  updateChart();
}