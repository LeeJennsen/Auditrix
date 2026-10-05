function toggleWhyFlagged() {
    var body = document.getElementById('whyFlaggedBody');
    var chevron = document.getElementById('whyFlaggedChevron');
    var expanded = body.style.display === 'block';
    body.style.display = expanded ? 'none' : 'block';
    chevron.style.transform = expanded ? 'rotate(0deg)' : 'rotate(180deg)';
  }

  function disableFlagButtons() {
    var agreeBtn = document.getElementById('agreeFlagBtn');
    var overrideBtn = document.getElementById('overrideFlagBtn');
    agreeBtn.disabled = true;
    overrideBtn.disabled = true;
    agreeBtn.style.opacity = '0.5';
    overrideBtn.style.opacity = '0.5';
    agreeBtn.style.cursor = 'not-allowed';
    overrideBtn.style.cursor = 'not-allowed';
  }

  function agreeWithFlag() {
    if (document.getElementById('agreeFlagBtn').disabled) return;
    disableFlagButtons();
    document.getElementById('overrideFeedback').innerHTML =
      '<div style="display: flex; align-items: flex-start; gap: 10px; background: #E8F5EE; border: 1px solid #BEE3CE; border-radius: 8px; padding: 12px 14px;">' +
      '<span style="font-size: 14px;">&#9989;</span>' +
      '<div style="font-size: 13px; color: #1E7F4D; line-height: 1.5;"><strong>Confirmed.</strong> AI assessment upheld.</div>' +
      '</div>';
  }

  var overrideReasonKey = null;
  var overrideReasonLabels = {
    rollback: 'Rollback plan documented elsewhere',
    approver: 'Approver separation confirmed manually'
  };

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function reasonChipStyle(active) {
    var base = 'padding: 8px 14px; border-radius: 999px; font-size: 12.5px; cursor: pointer;';
    if (active) return base + ' border: 1px solid #2563EB; background: #DBEAFE; color: #1D4ED8; font-weight: 600;';
    return base + ' border: 1px solid #CBD5E1; background: #FFFFFF; color: #334155; font-weight: 500;';
  }

  function showOverridePanel() {
    if (document.getElementById('overrideFlagBtn').disabled) return;
    document.getElementById('overridePanel').style.display = 'block';

    var agreeBtn = document.getElementById('agreeFlagBtn');
    var overrideBtn = document.getElementById('overrideFlagBtn');
    agreeBtn.disabled = true;
    overrideBtn.disabled = true;
    agreeBtn.style.opacity = '0.5';
    overrideBtn.style.opacity = '0.5';
    agreeBtn.style.cursor = 'not-allowed';
    overrideBtn.style.cursor = 'not-allowed';
  }

  function cancelOverride() {
    document.getElementById('overridePanel').style.display = 'none';
    overrideReasonKey = null;
    document.getElementById('otherReasonWrap').style.display = 'none';
    document.getElementById('otherReasonText').value = '';
    ['rollback', 'approver', 'other'].forEach(function (k) {
      document.getElementById('reasonBtn-' + k).setAttribute('style', reasonChipStyle(false));
    });
    updateSubmitOverrideState();

    var agreeBtn = document.getElementById('agreeFlagBtn');
    var overrideBtn = document.getElementById('overrideFlagBtn');
    agreeBtn.disabled = false;
    overrideBtn.disabled = false;
    agreeBtn.style.opacity = '';
    overrideBtn.style.opacity = '';
    agreeBtn.style.cursor = 'pointer';
    overrideBtn.style.cursor = 'pointer';
  }

  function selectOverrideReason(key) {
    overrideReasonKey = key;
    ['rollback', 'approver', 'other'].forEach(function (k) {
      document.getElementById('reasonBtn-' + k).setAttribute('style', reasonChipStyle(k === key));
    });
    document.getElementById('otherReasonWrap').style.display = key === 'other' ? 'block' : 'none';
    updateSubmitOverrideState();
  }

  function onOtherReasonInput() {
    updateSubmitOverrideState();
  }

  function getOverrideReasonText() {
    if (overrideReasonKey === 'other') return document.getElementById('otherReasonText').value.trim();
    if (overrideReasonKey && overrideReasonLabels[overrideReasonKey]) return overrideReasonLabels[overrideReasonKey];
    return '';
  }

  function updateSubmitOverrideState() {
    var btn = document.getElementById('submitOverrideBtn');
    var hasReason = getOverrideReasonText().length > 0;
    btn.disabled = !hasReason;
    btn.style.opacity = hasReason ? '1' : '0.5';
    btn.style.cursor = hasReason ? 'pointer' : 'not-allowed';
  }

  function submitOverride() {
    if (document.getElementById('submitOverrideBtn').disabled) return;
    var reasonText = getOverrideReasonText();
    document.getElementById('overridePanel').style.display = 'none';
    disableFlagButtons();
    document.getElementById('overrideFeedback').innerHTML =
      '<div style="display: flex; align-items: flex-start; gap: 10px; background: #DBEAFE; border: 1px solid #93C5FD; border-radius: 8px; padding: 12px 14px;">' +
      '<span style="font-size: 14px;">&#8635;</span>' +
      '<div style="font-size: 13px; color: #1D4ED8; line-height: 1.5;"><strong>Override recorded:</strong> \'' + escapeHtml(reasonText) + '\'. This will be used to recalibrate the rubric during the pilot.</div>' +
      '</div>';
  }

  function setDecision(decision) {
    var banner = document.getElementById('decisionBanner');
    var style = 'font-size: 12.5px; font-weight: 600; padding: 8px 12px; border-radius: 8px;';
    var text = '';
    if (decision === 'approved') {
      text = '✓ Approved as audited';
      style += ' background: #E8F5EE; color: #1E7F4D;';
    } else if (decision === 'sent_back') {
      text = '✓ Sent back to CR owner for rollback plan correction';
      style += ' background: #FBEAE6; color: #B4432F;';
    } else {
      style += ' background: transparent; color: transparent;';
    }
    banner.setAttribute('style', style);
    banner.textContent = text;
  }
