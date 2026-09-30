type QueryError={code?:string;message?:string};
export function missingProfileColor(error:QueryError|null){
  return !!error&&['42703','PGRST204'].includes(error.code??'')&&/\bidentification_color\b/.test(error.message??'');
}
// A visual preference must never prevent authentication during a staged rollout.
// Retry only this missing optional column; permission and other schema errors remain errors.
export async function readWithOptionalProfileColor<T>(query:(withColor:boolean)=>PromiseLike<{data:T|null;error:QueryError|null}>){
  const result=await query(true);
  return missingProfileColor(result.error)?await query(false):result;
}
