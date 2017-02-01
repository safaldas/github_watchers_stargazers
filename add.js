function add(q, a) {
    if (Array.isArray(q) && Array.isArray(a)) {
        let t = []
        t.push(q)
        t.push(a)
        return t
    }
    else{
        console.error('Type error')
    }
}
let a=[1],q={'ee':'ww'}

console.log(add(q,a))