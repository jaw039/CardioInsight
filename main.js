let data = [];
let selectedGenders = new Set(["male", "female"]);
let genderLookup = {};
let ageLookup = {};
let weightLookup = {};
let temperatureLookup = {};

// Modify your existing data loading code
d3.csv("subject-info.csv")
  .then((subjectData) => {
    // Get ranges for all filters
    const ages = subjectData.map(d => +d.Age).filter(age => !isNaN(age));
    const weights = subjectData.map(d => +d.Weight).filter(w => !isNaN(w));
    const temperatures = subjectData.map(d => +d.Temperature).filter(t => !isNaN(t));

    // Set up all sliders
    setupSlider("#age-min", "#age-max", Math.floor(d3.min(ages)), Math.ceil(d3.max(ages)), "years");
    setupSlider("#weight-min", "#weight-max", Math.floor(d3.min(weights)), Math.ceil(d3.max(weights)), "kg");
    setupSlider("#temp-min", "#temp-max", Math.floor(d3.min(temperatures)), Math.ceil(d3.max(temperatures)), "°C");

    // Store all metadata
    subjectData.forEach((d) => {
      if (d.ID) {
        let trimmedID = String(d.ID).trim();
        
        if (d.Sex === "1") {
          genderLookup[trimmedID] = "female";
        } else if (d.Sex === "0") {
          genderLookup[trimmedID] = "male";
        }
        
        ageLookup[trimmedID] = +d.Age;
        weightLookup[trimmedID] = +d.Weight;
        temperatureLookup[trimmedID] = +d.Temperature;
      }
    });

    return d3.csv("test_measure.csv");
  })
  .then((rawData) => {
    data = rawData
      .map((d) => {
        let trimmedID = String(d.ID).trim();
        let VO2Value = +d.VO2;
        
        return {
          VO2: VO2Value / 100,
          gender: genderLookup[trimmedID] || "unknown",
          age: ageLookup[trimmedID],
          weight: weightLookup[trimmedID],
          temperature: temperatureLookup[trimmedID]
        };
      })
      .filter((d) => d.VO2 >= 0 && d.VO2 <= 80);

    createHistogram();
  })
  .catch((error) => console.error("Error loading CSV:", error));

// Add these new functions
function setupSlider(minId, maxId, minVal, maxVal, unit) {
  d3.select(minId)
    .attr("min", minVal)
    .attr("max", maxVal)
    .attr("value", minVal);

  d3.select(maxId)
    .attr("min", minVal)
    .attr("max", maxVal)
    .attr("value", maxVal);

  d3.select(minId).on("input", updateAllDisplays);
  d3.select(maxId).on("input", updateAllDisplays);

  updateDisplay(minId, maxId, unit);
}

function updateAllDisplays() {
  updateDisplay("#age-min", "#age-max", "years");
  updateDisplay("#weight-min", "#weight-max", "kg");
  updateDisplay("#temp-min", "#temp-max", "°C");
  createHistogram();
}

function updateDisplay(minId, maxId, unit) {
  const min = +d3.select(minId).property("value");
  const max = +d3.select(maxId).property("value");
  const displayId = `${minId}-display`.replace("#", "#value-");
  d3.select(displayId).text(`${min} - ${max} ${unit}`);
}

// Modify your createHistogram function to include all filters
function createHistogram() {
  const minAge = +d3.select("#age-min").property("value");
  const maxAge = +d3.select("#age-max").property("value");
  const minWeight = +d3.select("#weight-min").property("value");
  const maxWeight = +d3.select("#weight-max").property("value");
  const minTemp = +d3.select("#temp-min").property("value");
  const maxTemp = +d3.select("#temp-max").property("value");

  const filteredData = data.filter(d => 
    d.age >= minAge && d.age <= maxAge &&
    d.weight >= minWeight && d.weight <= maxWeight &&
    d.temperature >= minTemp && d.temperature <= maxTemp
  );

  d3.select("#chart").selectAll("*").remove();

  const width = 1200,  
  height = 650,    
  margin = { 
      top: 30,     
      right: 30,   
      bottom: 80,  
      left: 80 
  };

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

  const binsMale = histogram(filteredData.filter((d) => d.gender === "male"));
  const binsFemale = histogram(filteredData.filter((d) => d.gender === "female"));

  function updateChart() {
    svg.selectAll(".bar, .axis, .brush").remove();

    let maxY = 0;
    let minX = Infinity;
    let maxX = -Infinity;

    if (selectedGenders.has("male")) {
      maxY = Math.max(maxY, d3.max(binsMale, d => d.length));
      minX = Math.min(minX, d3.min(binsMale, d => d.x0));
      maxX = Math.max(maxX, d3.max(binsMale, d => d.x1));
    }
    if (selectedGenders.has("female")) {
      maxY = Math.max(maxY, d3.max(binsFemale, d => d.length));
      minX = Math.min(minX, d3.min(binsFemale, d => d.x0));
      maxX = Math.max(maxX, d3.max(binsFemale, d => d.x1));
    }

    if (!selectedGenders.size) {
      minX = 0;
      maxX = 60;
      maxY = 1;
    }

    maxY = maxY * 1.1;

    const x = d3.scaleLinear()
      .domain([minX, maxX])
      .nice()
      .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
      .domain([0, maxY])
      .nice()
      .range([height - margin.bottom, margin.top]);

    histogram.domain(x.domain());

    // Draw axes
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

    // Add brush after axes but before bars
    const brush = d3.brushX()
      .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]])
      .on("end", brushed);

    svg.append("g")
      .attr("class", "brush")
      .call(brush);

    function brushed(event) {
      if (!event.selection) {
        d3.select("#brush-stats").html("");
        return;
      }

      const [x0, x1] = event.selection.map(x.invert);
      const selectedData = filteredData.filter(d => d.VO2 >= x0 && d.VO2 <= x1);

      if (selectedData.length === 0) {
        d3.select("#brush-stats").html("");
        return;
      }

      const maleCount = selectedData.filter(d => d.gender === "male").length;
      const femaleCount = selectedData.filter(d => d.gender === "female").length;
      const avgVO2 = d3.mean(selectedData, d => d.VO2);

      d3.select("#brush-stats")
        .style("text-align", "center")
        .style("font-size", "16px")
        .html(`
          <strong>Selected Range: ${x0.toFixed(1)} - ${x1.toFixed(1)} ml/kg/min</strong><br>
          <strong>Total Count: ${(maleCount + femaleCount).toLocaleString()}</strong><br>
          <strong>Average VO2: ${avgVO2.toFixed(2)} ml/kg/min</strong><br>
          <strong>Male Count: ${maleCount.toLocaleString()}</strong><br>
          <strong>Female Count: ${femaleCount.toLocaleString()}</strong>
        `);
    }

    // Draw bars
    if (selectedGenders.has("male")) {
      svg.append("g")
        .selectAll("rect")
        .data(binsMale)
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

      svg.selectAll(".bar-male")
        .on("mouseover", function(event, d) {
          tooltip.transition().duration(200).style("opacity", 0.9);
          tooltip.html(`
            <strong>Male</strong><br/>
            Range: ${d.x0.toFixed(1)} - ${d.x1.toFixed(1)}<br/>
            Count: ${d.length.toLocaleString()}
          `)
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px");
        })
        .on("mouseout", function() {
          tooltip.transition().duration(500).style("opacity", 0);
        });
    }

    if (selectedGenders.has("female")) {
      svg.append("g")
        .selectAll("rect")
        .data(binsFemale)
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

      svg.selectAll(".bar-female")
        .on("mouseover", function(event, d) {
          tooltip.transition().duration(200).style("opacity", 0.9);
          tooltip.html(`
            <strong>Female</strong><br/>
            Range: ${d.x0.toFixed(1)} - ${d.x1.toFixed(1)}<br/>
            Count: ${d.length.toLocaleString()}
          `)
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px");
        })
        .on("mouseout", function() {
          tooltip.transition().duration(500).style("opacity", 0);
        });
    }
  }

  // Button event handlers
  d3.select("#maleButton").on("click", function() {
    toggleFilter("male", this);
  });

  d3.select("#femaleButton").on("click", function() {
    toggleFilter("female", this);
  });

  d3.select("#bothButton").on("click", function() {
    selectedGenders.clear();
    selectedGenders.add("male");
    selectedGenders.add("female");
    
    d3.select("#maleButton").classed("active", true);
    d3.select("#femaleButton").classed("active", true);
    d3.select(this).classed("active", true);
    
    updateChart();
  });

  function toggleFilter(gender, button) {
    d3.select("#bothButton").classed("active", false);
    
    if (selectedGenders.has(gender)) {
      selectedGenders.delete(gender);
      button.classList.remove("active");
    } else {
      selectedGenders.add(gender);
      button.classList.add("active");
    }
    updateChart();
  }

  // Initial render
  updateChart();
}