var activeStyle = 'padding: 9px 16px; border-radius: 8px; border: none; font-size: 13px; font-weight: 600; cursor: pointer; background: #2563EB; color: #FFFFFF;';
  var inactiveStyle = 'padding: 9px 16px; border-radius: 8px; border: 1px solid #CBD5E1; font-size: 13px; font-weight: 500; cursor: pointer; background: #FFFFFF; color: #334155;';
  var types = ['CR', 'INC', 'SR', 'PRB'];

  function showRubric(type) {
    types.forEach(function (t) {
      document.getElementById('tab-' + t).setAttribute('style', t === type ? activeStyle : inactiveStyle);
      document.getElementById('rubric-' + t).style.display = t === type ? '' : 'none';
    });
  }

  showRubric('CR');

  var whatIf = { rollback: true, approver: true, pir: true };
  var changeType = 'normal';

  var changeTypeActiveStyle = 'padding: 7px 14px; border-radius: 999px; border: 1px solid #2563EB; background: #2563EB; color: #FFFFFF; font-size: 12.5px; font-weight: 600; cursor: pointer;';
  var changeTypeInactiveStyle = 'padding: 7px 14px; border-radius: 999px; border: 1px solid #CBD5E1; background: #FFFFFF; color: #334155; font-size: 12.5px; font-weight: 500; cursor: pointer;';

  function whatIfToggleStyle(pass) {
    if (pass) return 'padding: 7px 16px; border-radius: 999px; border: 1px solid #1E7F4D; background: #E8F5EE; color: #1E7F4D; font-size: 12.5px; font-weight: 700; cursor: pointer; min-width: 64px;';
    return 'padding: 7px 16px; border-radius: 999px; border: 1px solid #B4432F; background: #FBEAE6; color: #B4432F; font-size: 12.5px; font-weight: 700; cursor: pointer; min-width: 64px;';
  }

  function notRequiredToggleStyle() {
    return 'padding: 7px 16px; border-radius: 999px; border: 1px solid #CBD5E1; background: #F1F5F9; color: #64748B; font-size: 12.5px; font-weight: 700; cursor: not-allowed; min-width: 64px;';
  }

  function setChangeType(type) {
    changeType = type;
    renderChangeType();
    renderWhatIf();
  }

  function renderChangeType() {
    document.getElementById('changeType-normal').setAttribute('style', changeType === 'normal' ? changeTypeActiveStyle : changeTypeInactiveStyle);
    document.getElementById('changeType-emergency').setAttribute('style', changeType === 'emergency' ? changeTypeActiveStyle : changeTypeInactiveStyle);

    var approverToggle = document.getElementById('wi-approver-toggle');
    var approverDesc = document.getElementById('wi-approver-desc');
    var approverBadge = document.getElementById('wi-approver-badge');

    if (changeType === 'emergency') {
      approverToggle.disabled = true;
      approverToggle.textContent = 'N/A';
      approverToggle.setAttribute('style', notRequiredToggleStyle());
      approverDesc.textContent = 'Not required (retrospective approval applies); excluded from the score penalty for Emergency Changes. Retrospective approval plus a mandatory post-implementation review within a defined window is required instead.';
      approverBadge.textContent = 'Not Required';
      approverBadge.setAttribute('style', 'display: inline-block; padding: 3px 9px; border-radius: 999px; font-size: 10.5px; font-weight: 600; background: #E2E8F0; color: #64748B;');
    } else {
      approverToggle.disabled = false;
      approverDesc.textContent = 'Toggling to Fail simulates a segregation-of-duties violation';
      approverBadge.textContent = 'Critical';
      approverBadge.setAttribute('style', 'display: inline-block; padding: 3px 9px; border-radius: 999px; font-size: 10.5px; font-weight: 600; background: #FBEAE6; color: #B4432F;');
    }
  }

  function renderWhatIf() {
    ['rollback', 'approver', 'pir'].forEach(function (key) {
      if (key === 'approver' && changeType === 'emergency') return;
      var btn = document.getElementById('wi-' + key + '-toggle');
      btn.textContent = whatIf[key] ? 'Pass' : 'Fail';
      btn.setAttribute('style', whatIfToggleStyle(whatIf[key]));
    });

    var score = 100;
    var flagged = false;
    ['rollback', 'approver', 'pir'].forEach(function (key) {
      if (key === 'approver' && changeType === 'emergency') return;
      if (!whatIf[key]) {
        score -= 30;
        flagged = true;
      }
    });
    if (score < 0) score = 0;

    var scoreEl = document.getElementById('whatIfScore');
    scoreEl.textContent = score;
    scoreEl.style.color = flagged ? '#B45309' : '#1E7F4D';

    var badge = document.getElementById('whatIfBadge');
    if (flagged) {
      badge.textContent = 'Overall: FLAGGED';
      badge.setAttribute('style', 'display: inline-block; padding: 6px 14px; border-radius: 999px; font-size: 12.5px; font-weight: 700; background: #FDF3E6; color: #B45309;');
    } else {
      badge.textContent = 'Overall: PASS';
      badge.setAttribute('style', 'display: inline-block; padding: 6px 14px; border-radius: 999px; font-size: 12.5px; font-weight: 700; background: #E8F5EE; color: #1E7F4D;');
    }
  }

  function whatIfToggle(key) {
    if (key === 'approver' && changeType === 'emergency') return;
    whatIf[key] = !whatIf[key];
    renderWhatIf();
  }

  renderChangeType();
  renderWhatIf();
