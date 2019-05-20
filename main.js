/* global $ M Chart */

let DOM_ALLELE = 'R'
let REC_ALLELE = 'r'

let HOMO_DOM = DOM_ALLELE + DOM_ALLELE
let HETERO = DOM_ALLELE + REC_ALLELE
let HETERO_REVERSE = REC_ALLELE + DOM_ALLELE
let HOMO_REC = REC_ALLELE + REC_ALLELE

let selectedAlleles = [[null, null], [null, null]]
let iterationCount = 1
let intialChildScrollHeight
/**
 * Contains all current offspring
 * @type {string[][]}
 */
let offspring = []
let genotypeChart = null
let phenotypeChart = null
const genotypeConfig = {
  type: 'pie',
  data: {
    labels: [HOMO_DOM, HETERO, HOMO_REC],
    datasets: [{
      data: [0, 0, 0],
      backgroundColor: [
        'rgb(102, 45, 145)',
        'rgb(189, 157, 202)',
        'rgb(200, 200, 200)'
      ]
    }]
  },
  options: {
    responsive: true,
    tooltips: {
      enabled: true,
      callbacks: {
        title: function (tooltipItem, data) {
          return data['labels'][tooltipItem[0]['index']]
        },
        label: function (tooltipItem, data) {
          return percentify(data['datasets'][0]['data'][tooltipItem['index']])
        }
      }
    },
    legend: {
      display: false
    },
    title: {
      display: false
    },
    animation: {
      animateScale: true,
      animateRotate: true
    },
    plugins: {
      datalabels: {
        display: function (context) {
          return context.dataset.data[context.dataIndex] > 0
        },
        formatter: function (value, context) {
          return context.chart.data.labels[context.dataIndex] + '\n' + percentify(value)
        }
      }
    }
  }
}

let phenotypeConfig = {}
Object.assign(phenotypeConfig, genotypeConfig)
phenotypeConfig.data = {
  labels: ['violet', 'white'],
  datasets: [{
    data: [0, 0],
    backgroundColor: [
      'rgb(102, 45, 145)',
      'rgb(200, 200, 200)'
    ]
  }]
}

$(document).ready(function () {
  // Set up labels for genotypes—must happen *before* Materialize inits
  let domSelects = $('.allele-select-dom')
  domSelects.val(DOM_ALLELE)
  domSelects.text(DOM_ALLELE)
  let recSelects = $('.allele-select-rec')
  recSelects.val(REC_ALLELE)
  recSelects.text(REC_ALLELE)
  $('#label-homo-dom').text(HOMO_DOM)
  $('#label-hetero').text(HETERO)
  $('#label-homo-rec').text(HOMO_REC)

  // Set up Materialize
  M.AutoInit()

  // Set up Chart text color
  Chart.defaults.global.defaultFontColor = 'white'

  // Get scrollHeight at 0 of child container
  intialChildScrollHeight = $('.child-container')[0].scrollHeight
})

// Respond to a change in a parent's alleles
$('.parent-select').change(function () {
  // Reset offspring for new parents
  clearOffspring()

  // Get genotype selections and add them to selectedAlleles
  let id = $(this).attr('id')
  let allele = $(this).val()
  switch (id) {
    case 'p1p1':
      $('#cross-table tr:eq(0) th:eq(1)').text(allele)
      selectedAlleles[0][0] = allele
      break
    case 'p1p2':
      $('#cross-table tr:eq(0) th:eq(2)').text(allele)
      selectedAlleles[0][1] = allele
      break
    case 'p2p1':
      $('#cross-table tr:eq(1) th:eq(0)').text(allele)
      selectedAlleles[1][0] = allele
      break
    case 'p2p2':
      $('#cross-table tr:eq(2) th:eq(0)').text(allele)
      selectedAlleles[1][1] = allele
      break
  }

  // Update parent image if all of that parent's alleles have been selected
  if (noNullArr(selectedAlleles[0])) {
    $('#parent-1-img').attr('src', `${getPhenotype(selectedAlleles[0])}.svg`)
  }
  if (noNullArr(selectedAlleles[1])) {
    $('#parent-2-img').attr('src', `${getPhenotype(selectedAlleles[1])}.svg`)
  }

  // Update cross table if all alleles have been selected
  if (allelesAreFilled()) {
    let crosses = [] // [0.0+1.0, 0.0+1.1, 0.1+1.0, 0.1+1.1]
    for (let i = 0; i < selectedAlleles[0].length; ++i) {
      for (let j = 0; j < selectedAlleles[1].length; ++j) {
        crosses.push(getGenotypeStr([selectedAlleles[0][i], selectedAlleles[1][j]]))
      }
    }
    let row1 = $('#cross-table tr:eq(1) td')
    row1.eq(0).text(crosses[0])
    row1.eq(1).text(crosses[2])

    let row2 = $('#cross-table tr:eq(2) td')
    row2.eq(0).text(crosses[1])
    row2.eq(1).text(crosses[3])
  }
})

// Respond to a change in how many offspring are to be generated (buttons along footer)
$('.num-buttons-row .btn').click(function () {
  $('.num-buttons-row .btn.green').removeClass('green').addClass('blue')
  $(this).removeClass('blue').addClass('green')
  iterationCount = parseInt($(this).text())
})

// Respond to start of simulation with animation
$('#play-button').click(function () {
  generateOffspring(true)
})

// Respond to start of simulation without animation
$('#ff-button').click(function () {
  generateOffspring(false)
})

$('#reset-button').click(function () {
  $('#confirm-reset-modal').modal('open')
})
$('#confirm-reset').click(() => window.location.reload())

/**
 * Safety checks allele selection and then generates random offspring based on `selectedAlleles`.
 * @param {Boolean} animated whether to animate the population of offspring—passed on to `populateOffspring`.
 */
function generateOffspring (animated) {
  if (!allelesAreFilled()) {
    $('#incomplete-alleles-modal').modal('open')
    return
  }
  toggleActionButtons(false)
  let indices = []
  for (let i = 0; i < iterationCount; ++i) {
    // Select a random genotype
    let ind0 = Math.floor(Math.random() * selectedAlleles[0].length)
    let ind1 = Math.floor(Math.random() * selectedAlleles[1].length)
    indices.push([ind0, ind1])
  }
  populateOffspring(indices, animated)
}

/**
 * Fills in new offspring on-screen, with or without animation.
 * @param {Array<Array<String>>} genotypes an array with the indices in each selectedAlleles array at which to find the genotype for the given offspring.
 * @example
 * selectedAlleles = [['R', 'R'], ['r', 'R']];
 * populateOffspring([[0, 1], [1, 1]]) // -> offspring with Rr and RR genotypes.
 * @param {Boolean} animated whether to animate.
 */
function populateOffspring (indices, animated) {
  let curIndices = indices.shift() // removes the current one for use this time, with the remainder being passed recursively forward
  let ind0 = curIndices[0]
  let ind1 = curIndices[1]
  let allele1 = selectedAlleles[0][ind0]
  let allele2 = selectedAlleles[1][ind1]
  let genotypeArr = [allele1, allele2]
  offspring.push(genotypeArr)
  let genotypeStr = getGenotypeStr(genotypeArr)

  // Animate allele selection
  let p1AlleleId = `#p1p${ind0 + 1}`
  let p2AlleleId = `#p2p${ind1 + 1}`
  let inputs = $(`${p1AlleleId}, ${p2AlleleId}`).siblings('input')
  if (animated) inputs.addClass('activated-allele')
  console.log(ind0, p1AlleleId, ind1, p2AlleleId)

  // Create and append the card
  let col = $('<div class="col s1">')
  let card = $('<div class="card darken-1">')

  let cardImg = $('<div class="card-image">')
  let phenotypeImg = $('<img>')
  phenotypeImg.attr('src', `${getPhenotype(genotypeArr)}.svg`)
  cardImg.append(phenotypeImg)

  let cardContent = $('<div class="card-content black-text">')
  let p = $('<p>')
  p.text(genotypeStr)
  cardContent.append(p)

  card.append(cardImg)
  card.append(cardContent)
  col.append(card)
  if (animated) col.hide()
  $('.child-container.row').append(col)

  let delayTimeMs
  if (iterationCount < 5) {
    delayTimeMs = 2000
  } else if (iterationCount < 15) {
    delayTimeMs = 1000
  } else {
    delayTimeMs = 500
  }
  if (animated) {
    col.fadeIn(delayTimeMs, function () {
      inputs.removeClass('activated-allele')
      updateStatistics()
      if (indices.length > 0) {
        setTimeout(() => populateOffspring(indices, animated), delayTimeMs)
      } else {
        toggleActionButtons(true)
      }
    })
  } else if (indices.length > 0) {
    populateOffspring(indices, animated)
  } else {
    updateStatistics()
    let scrollPos = $('.child-container')[0].scrollTop
    let scrollHeight = $('.child-container')[0].scrollHeight
    if (scrollPos !== scrollHeight - intialChildScrollHeight) {
      $('.child-container').animate({ scrollTop: scrollHeight }, 250, function () {
        toggleActionButtons(true)
      })
    } else {
      toggleActionButtons(true)
    }
  }
}

function updateStatistics () {
  let totals = {}
  totals[HOMO_DOM] = 0
  totals[HETERO] = 0
  totals[HOMO_REC] = 0
  let totalOffspring = offspring.length

  $('#offspring-count').text(totalOffspring)

  let offspringStrs = offspring.map(e => getGenotypeStr(e)) // arrays can't be compared, use strings instead
  for (let genotype of offspringStrs) {
    switch (genotype) {
      case HETERO_REVERSE:
        // equivalent to heterozygous, fall through
      case HETERO:
        ++totals[HETERO]
        break
      case HOMO_REC:
        ++totals[HOMO_REC]
        break
      case HOMO_DOM:
        ++totals[HOMO_DOM]
        break
    }
  }

  let heteroPercent = totals[HETERO] / totalOffspring
  let homoRPercent = totals[HOMO_REC] / totalOffspring
  let homoDPercent = totals[HOMO_DOM] / totalOffspring
  let violetPercent = heteroPercent + homoDPercent
  let homoRPercentStr = percentify(homoRPercent)

  // Fill in genotype table
  $('#genotype-hetero').text(percentify(heteroPercent))
  $('#genotype-homo-rec').text(homoRPercentStr)
  $('#genotype-homo-dom').text(percentify(homoDPercent))

  // Fill in phenotype table
  $('#phenotype-white').text(homoRPercentStr)
  $('#phenotype-violet').text(percentify(violetPercent))

  // Set up graphs
  let genotypeData = [homoDPercent, heteroPercent, homoRPercent]
  if (genotypeChart === null) {
    let genotypeCtx = document.getElementById('genotype-chart').getContext('2d')
    genotypeConfig.data.datasets[0].data = genotypeData
    genotypeChart = new Chart(genotypeCtx, genotypeConfig)
  } else {
    genotypeChart.data.datasets[0].data = genotypeData
    genotypeChart.update()
  }

  let phenotypeData = [violetPercent, homoRPercent]
  if (phenotypeChart === null) {
    let phenotypeCtx = document.getElementById('phenotype-chart').getContext('2d')
    phenotypeConfig.data.datasets[0].data = phenotypeData
    phenotypeChart = new Chart(phenotypeCtx, phenotypeConfig)
  } else {
    phenotypeChart.data.datasets[0].data = phenotypeData
    phenotypeChart.update()
  }
}

function clearOffspring () {
  $('.child-container').children().remove()
  $('.genotype-datum').text('')
  $('.phenotype-datum').text('')
  if (genotypeChart !== null) {
    genotypeChart.destroy()
    genotypeChart = null
  }
  if (phenotypeChart !== null) {
    phenotypeChart.destroy()
    phenotypeChart = null
  }
  offspring = []
}

function toggleActionButtons (enable) {
  $('input').attr('disabled', !enable)
  let aButtons = $('#play-button, #ff-button, .num-buttons-row .btn')
  if (enable === false) {
    aButtons.attr('disabled', '')
  } else {
    aButtons.removeAttr('disabled')
  }
}

// MARK: Utility functions

function getGenotypeStr (genotypeArray) {
  let genotype = genotypeArray.concat().sort().join('')
  return genotype
}

/**
 * Gets the phenotype associated with a genotype.
 * @param {Array<String>|String} genotype the genotype whose phenotype to get.
 */
function getPhenotype (genotype) {
  if (typeof genotype !== 'string') {
    genotype = getGenotypeStr(genotype)
  }
  return genotype === HOMO_REC ? 'white' : 'violet'
}

function allelesAreFilled () {
  return selectedAlleles.every(noNullArr)
}

function noNullArr (arr) {
  return arr.indexOf(null) === -1
}

/**
 * Converts a decimal number to a percent string.
 * @param {Number} decimal the decimal to convert.
 * @returns {String} a string representation of the percent.
 */
function percentify (decimal) {
  return `${+((decimal * 100).toFixed(2))}%`
}
