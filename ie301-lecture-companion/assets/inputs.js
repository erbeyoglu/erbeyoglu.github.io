/* Numeric domains are checked before model evaluation, not just by spinner UI. */
window.COURSE_INPUT = {
  integers(ids, min, max) {
    const fields=ids.map(id=>document.getElementById(id));
    const values=fields.map(field=>field.value.trim()==='' ? NaN : Number(field.value));
    let valid=true;
    fields.forEach((field,i)=>{
      const ok=Number.isFinite(values[i]) && Number.isInteger(values[i]) && values[i]>=min && values[i]<=max;
      field.setCustomValidity(ok ? '' : `Enter a whole number from ${min} to ${max}.`);
      field.setAttribute('aria-invalid',String(!ok));
      valid=valid && ok;
    });
    return valid ? values : null;
  }
};
