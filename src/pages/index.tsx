import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import shamir from "shamir";

const ModularApp = () => {
  // Modular Arithmetic State
  const [num1, setNum1] = useState('');
  const [num2, setNum2] = useState('');
  const [prime, setPrime] = useState('');
  const [operation, setOperation] = useState('add');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [secret, setSecret] = useState("");
  const [primeNum, setPrimeNum] = useState("");
  const [shares, setShares] = useState([]);
  const [leafValues, setLeafValues] = useState(['', '', '', '', '', '', '', '']);
  const [highlightedNodes, setHighlightedNodes] = useState(new Set());

  // SHA256 Hashing State
  const [inputString, setInputString] = useState('');
  const [hashedOutput, setHashedOutput] = useState('');

  // Modular Arithmetic Calculations
  const isPrime = (n) => {
    if (n <= 1) return false;
    for (let i = 2; i <= Math.sqrt(n); i++) {
      if (n % i === 0) return false;
    }
    return true;
  };

  const calculate = () => {
    setError('');
    setResult(null);

    const a = parseInt(num1);
    const b = parseInt(num2);
    const p = parseInt(prime);

    if (isNaN(a) || isNaN(b) || isNaN(p)) {
      setError('Please enter valid numbers');
      return;
    }

    if (!isPrime(p)) {
      setError('Modulus must be a prime number');
      return;
    }

    let calcResult;
    switch (operation) {
      case 'add':
        calcResult = (a + b) % p;
        break;
      case 'subtract':
        calcResult = (((a - b) % p) + p) % p;
        break;
      case 'multiply':
        calcResult = (a * b) % p;
        break;
      case 'divide':
        const findInverse = (a, m) => {
          for (let x = 1; x < m; x++) {
            if ((a * x) % m === 1) return x;
          }
          return null;
        };
        const inverse = findInverse(b, p);
        if (inverse === null) {
          setError('Division not possible (no multiplicative inverse)');
          return;
        }
        calcResult = (a * inverse) % p;
        break;
      default:
        setError('Invalid operation');
        return;
    }

    setResult(calcResult);
  };

  // SHA256 Hashing Function
  const calculateSHA256 = async () => {
    if (!inputString) {
      setHashedOutput('');
      return;
    }

    try {
      // Convert string to UTF-8 encoded Uint8Array
      const encoder = new TextEncoder();
      const data = encoder.encode(inputString);

      // Hash the data using Web Crypto API
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);

      // Convert buffer to hex string
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      setHashedOutput(hashHex);
    } catch (error) {
      console.error('Hashing error:', error);
      setHashedOutput('Error generating hash');
    }
  };
  const computeSHA256 = async (input) => {
    if (!input) return '';
    
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      return hashHex;
    } catch (error) {
      console.error('Hashing failed:', error);
      return '';
    }
  };

  // Pure JavaScript SHA256 implementation
  const sha256 = (input) => {
    // Helper functions for SHA256
    const rotr = (n, x) => (x >>> n) | (x << (32 - n));
    const ch = (x, y, z) => (x & y) ^ (~x & z);
    const maj = (x, y, z) => (x & y) ^ (x & z) ^ (y & z);
    const sigma0 = (x) => rotr(2, x) ^ rotr(13, x) ^ rotr(22, x);
    const sigma1 = (x) => rotr(6, x) ^ rotr(11, x) ^ rotr(25, x);
    const gamma0 = (x) => rotr(7, x) ^ rotr(18, x) ^ (x >>> 3);
    const gamma1 = (x) => rotr(17, x) ^ rotr(19, x) ^ (x >>> 10);

    // Initial hash values
    let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
    let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

    // Constants
    const k = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];

    // Prepare input
    const msg = input || '';
    const msgLen = msg.length;
    const wordLen = 8;
    const byteLen = wordLen * 4;
    
    // Padding
    const paddedMsg = msg + String.fromCharCode(0x80);
    const zeroPadding = new Array(
      64 - ((msgLen + 9) % 64)
    ).fill(String.fromCharCode(0)).join('');
    
    const fullMsg = paddedMsg + zeroPadding + 
      String.fromCharCode(
        (msgLen >>> 24) & 0xFF,
        (msgLen >>> 16) & 0xFF,
        (msgLen >>> 8) & 0xFF,
        msgLen & 0xFF
      );

    // Process message in 64-byte chunks
    for (let i = 0; i < fullMsg.length; i += 64) {
      const chunk = fullMsg.slice(i, i + 64);
      const w = new Array(64).fill(0);
      
      // Prepare message schedule
      for (let j = 0; j < 16; j++) {
        w[j] = (chunk.charCodeAt(j * 4) << 24) |
               (chunk.charCodeAt(j * 4 + 1) << 16) |
               (chunk.charCodeAt(j * 4 + 2) << 8) |
               chunk.charCodeAt(j * 4 + 3);
      }

      for (let j = 16; j < 64; j++) {
        const s0 = gamma0(w[j - 15]);
        const s1 = gamma1(w[j - 2]);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) & 0xFFFFFFFF;
      }

      // Working variables
      let [a, b, c, d, e, f, g, h] = 
        [h0, h1, h2, h3, h4, h5, h6, h7];

      // Main loop
      for (let j = 0; j < 64; j++) {
        const S1 = sigma1(e);
        const ch_result = ch(e, f, g);
        const temp1 = (h + S1 + ch_result + k[j] + w[j]) & 0xFFFFFFFF;
        const S0 = sigma0(a);
        const maj_result = maj(a, b, c);
        const temp2 = (S0 + maj_result) & 0xFFFFFFFF;

        h = g;
        g = f;
        f = e;
        e = (d + temp1) & 0xFFFFFFFF;
        d = c;
        c = b;
        b = a;
        a = (temp1 + temp2) & 0xFFFFFFFF;
      }

      // Update hash values
      h0 = (h0 + a) & 0xFFFFFFFF;
      h1 = (h1 + b) & 0xFFFFFFFF;
      h2 = (h2 + c) & 0xFFFFFFFF;
      h3 = (h3 + d) & 0xFFFFFFFF;
      h4 = (h4 + e) & 0xFFFFFFFF;
      h5 = (h5 + f) & 0xFFFFFFFF;
      h6 = (h6 + g) & 0xFFFFFFFF;
      h7 = (h7 + h) & 0xFFFFFFFF;
    }

    // Convert to hex string
    const toHex = (num) => {
      return num.toString(16).padStart(8, '0');
    };

    return [h0, h1, h2, h3, h4, h5, h6, h7]
      .map(toHex)
      .join('');
  };

  // Compute node values recursively
  const computeNodeValue = (index) => {
    if (index >= 7) {
      return leafValues[index - 7] || '';
    }
    const leftChild = computeNodeValue(2 * index + 1);
    const rightChild = computeNodeValue(2 * index + 2);
    return leftChild || rightChild 
      ? sha256(leftChild + rightChild) 
      : '';
  };

  // Update leaf and trigger highlighting
  const updateLeaf = (index, value) => {
    const newLeafValues = [...leafValues];
    newLeafValues[index] = value;
    setLeafValues(newLeafValues);

    // Highlight path from leaf to root
    const highlightPath = new Set();
    let currentIndex = index + 7;
    while (currentIndex > 0) {
      highlightPath.add(currentIndex);
      currentIndex = Math.floor((currentIndex - 1) / 2);
    }
    highlightPath.add(0); // Add root
    setHighlightedNodes(highlightPath);

    // Reset highlighting after 5 seconds
    setTimeout(() => {
      setHighlightedNodes(new Set());
    }, 5000);
  };


  // Node rendering function
  const renderNode = (index) => {
    const value = computeNodeValue(index);
    const isLeaf = index >= 7;
    const isHighlighted = highlightedNodes.has(index);

    return (
      <div
        key={index}
        className={`
          flex flex-col items-center
          ${isHighlighted ? 'bg-yellow-200' : 'bg-white'}
          border border-black p-2 rounded
          ${isLeaf ? 'w-24' : 'w-48'}
        `}
      >
        {isLeaf ? (
          <input
            type="text"
            value={leafValues[index - 7]}
            onChange={(e) => updateLeaf(index - 7, e.target.value)}
            placeholder="Enter value"
            className="border p-1 w-full"
          />
        ) : (
          <div className="text-center break-words w-full">{value}</div>
        )}
      </div>
    );
  };
  // Utility to compute the SHA256 hash using the Web Crypto API
  const sha256v2 = async (data: string): Promise<string> => {
    const encoder = new TextEncoder();
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", encoder.encode(data));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
  };

  // Function to compute the Merkle Tree
  const computeMerkleTree = async (leaves: string[]): Promise<string[][]> => {
    const hashedLeaves = await Promise.all(leaves.map(sha256v2));
    let tree: string[][] = [hashedLeaves];

    while (tree[tree.length - 1].length > 1) {
      const currentLayer = tree[tree.length - 1];
      const nextLayer = [];
      for (let i = 0; i < currentLayer.length; i += 2) {
        const left = currentLayer[i];
        const right = currentLayer[i + 1] || left; // Handle odd leaves by duplicating
        nextLayer.push(await sha256v2(left + right));
      }
      tree.push(nextLayer);
    }

    return tree;
  };

  // Function to compute decommitments (proofs)
  const getDecommitment = (tree: string[][], index: number): string[] => {
    const proof: string[] = [];
    for (let i = 0; i < tree.length - 1; i++) {
      const layer = tree[i];
      const isRightNode = index % 2 === 1;
      const pairIndex = isRightNode ? index - 1 : index + 1;

      if (pairIndex < layer.length) {
        proof.push(layer[pairIndex]);
      }
      index = Math.floor(index / 2);
    }
    return proof;
  };
  const [leavesInput, setLeavesInput] = useState<string>("");
  const [merkleTree, setMerkleTree] = useState<string[][] | null>(null);
  const [selectedLeafIndex, setSelectedLeafIndex] = useState<number | null>(null);
  const [decommitment, setDecommitment] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateTree = async () => {
    setIsLoading(true);
    const leaves = leavesInput
      .split(",")
      .map((leaf) => leaf.trim())
      .filter((leaf) => leaf !== "");
    if (leaves.length === 0) {
      alert("Please provide valid leaves (comma-separated).");
      setIsLoading(false);
      return;
    }
    const tree = await computeMerkleTree(leaves);
    setMerkleTree(tree);
    setSelectedLeafIndex(null);
    setDecommitment(null);
    setIsLoading(false);
  };

  const handleShowDecommitment = (index: number) => {
    if (!merkleTree) return;
    const proof = getDecommitment(merkleTree, index);
    setSelectedLeafIndex(index);
    setDecommitment(proof);
  };


const PRIME = 97;
const PRIMITIVE_ROOT = 5;

// Modular exponentiation
const modPow = (base, exp, modulus) => {
  if (exp === 0) return 1;
  let result = 1;
  base = base % modulus;
  while (exp > 0) {
    if (exp & 1) result = (result * base) % modulus;
    base = (base * base) % modulus;
    exp = exp >> 1;
  }
  return result;
};

// Modular multiplicative inverse
const modInverse = (a, m) => {
  const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
  const extendedGcd = (a, b) => {
    if (b === 0) return [1, 0];
    const [x, y] = extendedGcd(b, a % b);
    return [y, x - Math.floor(a / b) * y];
  };
  
  if (gcd(a, m) !== 1) throw new Error("Inverse doesn't exist");
  let [x] = extendedGcd(a, m);
  return ((x % m) + m) % m;
};

// Bit-reversal permutation
const bitReverse = (n, bits) => {
  let reversed = 0;
  for (let i = 0; i < bits; i++) {
    reversed = (reversed << 1) | (n & 1);
    n >>= 1;
  }
  return reversed;
};

// Inverse FFT implementation
const inverseFFT = (values, prime, root) => {
  const n = values.length;
  const logN = Math.log2(n);
  
  // Get inverse of root for inverse FFT
  root = modInverse(root, prime);
  
  // Bit-reverse copy
  const result = new Array(n);
  for (let i = 0; i < n; i++) {
    result[bitReverse(i, logN)] = values[i];
  }
  
  // Calculate inverse FFT
  for (let s = 1; s <= logN; s++) {
    const m = 1 << s;
    const halfM = m >> 1;
    const omega = modPow(root, (prime - 1) / m, prime);
    
    for (let k = 0; k < n; k += m) {
      let current = 1;
      for (let j = 0; j < halfM; j++) {
        const t = (current * result[k + j + halfM]) % prime;
        const u = result[k + j];
        result[k + j] = (u + t) % prime;
        result[k + j + halfM] = ((u - t) % prime + prime) % prime;
        current = (current * omega) % prime;
      }
    }
  }
  
  // Scale by n^(-1)
  const nInv = modInverse(n, prime);
  for (let i = 0; i < n; i++) {
    result[i] = (result[i] * nInv) % prime;
  }
  
  return result;
};

// Forward FFT implementation
const forwardFFT = (values, prime, root) => {
  const n = values.length;
  const logN = Math.log2(n);
  
  // Bit-reverse copy
  const result = new Array(n);
  for (let i = 0; i < n; i++) {
    result[bitReverse(i, logN)] = values[i];
  }
  
  // Calculate forward FFT
  for (let s = 1; s <= logN; s++) {
    const m = 1 << s;
    const halfM = m >> 1;
    const omega = modPow(root, (prime - 1) / m, prime);
    
    for (let k = 0; k < n; k += m) {
      let current = 1;
      for (let j = 0; j < halfM; j++) {
        const t = (current * result[k + j + halfM]) % prime;
        const u = result[k + j];
        result[k + j] = (u + t) % prime;
        result[k + j + halfM] = ((u - t) % prime + prime) % prime;
        current = (current * omega) % prime;
      }
    }
  }
  
  return result;
};

  const [input1, setInput1] = useState('');
  const [input2, setInput2] = useState('');
  const [secrets, setSecrets] = useState([]);
  const [coefficients, setCoefficients] = useState([]);
  const [evaluation, setEvaluation] = useState([]);
  const [encoding, setEncoding] = useState([]);

  const handleCompute = () => {
    // Validate inputs
    const num1 = parseInt(input1);
    const num2 = parseInt(input2);
    if (isNaN(num1) || isNaN(num2) || num1 < 0 || num1 >= PRIME || num2 < 0 || num2 >= PRIME) {
      alert('Please enter valid numbers between 0 and 96');
      return;
    }

    // Generate random numbers
    const random1 = Math.floor(Math.random() * PRIME);
    const random2 = Math.floor(Math.random() * PRIME);

    // Create initial vector
    const initialVector = [num1, num2, random1, random2];
    setSecrets(initialVector);

    // Compute inverse FFT
    const coeffs = inverseFFT(initialVector, PRIME, PRIMITIVE_ROOT);
    setCoefficients(coeffs);

    // Extend to 32 elements
    const extendedVector = [...coeffs];
    for (let i = coeffs.length; i < 32; i++) {
      extendedVector.push(0);
    }

    // Compute forward FFT
    const evalu = forwardFFT(extendedVector, PRIME, PRIMITIVE_ROOT);
    setEvaluation(evalu);

    // Extract odd indices
    const enc = evalu.filter((_, index) => index % 2 === 1);
    setEncoding(enc);
  };

  // Function to determine the color for evaluation indices
  const getEvaluationColor = (index) => {
    if ([0, 8, 16, 24].includes(index)) return "text-green-600";
    if (index % 2 === 1) return "text-blue-600";
    return "";
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-center mb-6">Modules</h1>
      
      <Tabs defaultValue="modular-arithmetic" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="modular-arithmetic">Modular Arithmetic</TabsTrigger>
          <TabsTrigger value="sha256-hash">SHA256 Hash</TabsTrigger>
          <TabsTrigger value="merkle">Merkle Tree</TabsTrigger>
          <TabsTrigger value="merkle-gpt">Merkle Tree - ChatGPT</TabsTrigger>
          <TabsTrigger value="shamir">Packed Secret Sharing</TabsTrigger>
        </TabsList>
        
        <TabsContent value="modular-arithmetic">
          <Card>
            <CardHeader>
              <CardTitle>Modular Arithmetic Calculator</CardTitle>
            </CardHeader>
            <CardContent>

              <Accordion type="single" collapsible className="w-full mb-4">
                <AccordionItem value="introduction">
                  <AccordionTrigger>What is Modular Arithmetic?</AccordionTrigger>
                  <AccordionContent>
                    <div className="text-sm space-y-2">
                      <p>
                        Modular arithmetic is like a mathematical clock where numbers "wrap around" after reaching a certain point (the modulus). 
                        When using a prime number as the modulus, we create a special mathematical structure called a finite field.
                      </p>
                      
                      <h3 className="font-semibold mt-2">Key Characteristics:</h3>
                      <ul className="list-disc pl-5">
                        <li>Uses a prime number p as the "clock face"</li>
                        <li>Contains integers {"{0, 1, 2, ..., p-1}"}</li>
                        <li>All arithmetic operations are performed modulo p</li>
                      </ul>

                      <h3 className="font-semibold mt-2">Operations Examples (mod 7):</h3>
                      <div className="bg-gray-100 p-2 rounded">
                        <p>Addition: 3 + 5 = 8 ≡ 1 (mod 7)</p>
                        <p>Multiplication: 3 * 4 = 12 ≡ 5 (mod 7)</p>
                        <p>Subtraction: 3 - 5 = -2 ≡ 5 (mod 7)</p>
                      </div>

                      <p className="mt-2">
                        Applications include cryptography, error correction, and computer security algorithms.
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

            <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <Input 
                    type="number" 
                    placeholder="First Number" 
                    value={num1} 
                    onChange={(e) => setNum1(e.target.value)}
                  />
                  <Select 
                    value={operation} 
                    onValueChange={setOperation}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="add">+</SelectItem>
                      <SelectItem value="subtract">-</SelectItem>
                      <SelectItem value="multiply">×</SelectItem>
                      <SelectItem value="divide">÷</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input 
                    type="number" 
                    placeholder="Second Number" 
                    value={num2} 
                    onChange={(e) => setNum2(e.target.value)}
                  />
                </div>
                
                <Input 
                  type="number" 
                  placeholder="Prime Modulus" 
                  value={prime} 
                  onChange={(e) => setPrime(e.target.value)}
                />
                
                <Button 
                  onClick={calculate} 
                  className="w-full"
                >
                  Calculate
                </Button>
                
                {error && (
                  <div className="text-red-500 text-center">
                    {error}
                  </div>
                )}
                
                {result !== null && (
                  <div className="text-center text-xl font-bold">
                    Result: {result}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
 
        <TabsContent value="sha256-hash">
          <Card>
            <CardHeader>
              <CardTitle>SHA256 Hash Generator</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input 
                  placeholder="Enter string to hash" 
                  value={inputString}
                  onChange={(e) => setInputString(e.target.value)}
                />
                
                <Button 
                  onClick={calculateSHA256} 
                  className="w-full"
                >
                  Generate Hash
                </Button>
                
                {hashedOutput && (
                  <div className="break-words">
                    <strong>Hash:</strong> 
                    <span className="block bg-gray-100 p-2 rounded mt-2">
                      {hashedOutput}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
       
        <TabsContent value="merkle">
          <Card>
            <CardHeader>
              <CardTitle>Merkle Tree Visualization</CardTitle>
            </CardHeader>
            <CardContent>
            <div className="flex flex-col items-center p-4 space-y-4">
              <div className="flex flex-col items-center space-y-4">
                {/* Root */}
                <div className="flex justify-center">{renderNode(0)}</div>

                {/* Second Level */}
                <div className="flex space-x-4">
                  {renderNode(1)}
                  {renderNode(2)}
                </div>

                {/* Third Level */}
                <div className="flex space-x-8">
                  {renderNode(3)}
                  {renderNode(4)}
                  {renderNode(5)}
                  {renderNode(6)}
                </div>

                {/* Leaves */}
                <div className="flex space-x-16">
                  {[7, 8, 9, 10, 11, 12, 13, 14].map(renderNode)}
                </div>
              </div>
            </div>
            </CardContent>
          </Card>
        </TabsContent>

          <TabsContent value="shamir">
      <Card>
      <CardHeader>
        <CardTitle>Packed Secret Sharing</CardTitle>
        <div className="text-sm text-gray-500 mt-2">
          <span className="mr-4">modulo = {PRIME}</span>
          <span className="mr-4">primitive root = {PRIMITIVE_ROOT}</span>
          <span className="mr-4">l = 2</span>
          <span className="mr-4">k = 4</span>
          <span>n = 16</span>
        </div>
      </CardHeader>
      <CardContent>
      <div className="space-y-4">
          <Input
            type="number"
            value={input1}
            onChange={(e) => setInput1(e.target.value)}
            placeholder="First number (0-96)"
            min="0"
            max="96"
            className="w-48"
          />
          <Input
            type="number"
            value={input2}
            onChange={(e) => setInput2(e.target.value)}
            placeholder="Second number (0-96)"
            min="0"
            max="96"
            className="w-48"
          />
          <Button onClick={handleCompute}>Compute shares</Button>
        </div>

        {secrets.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">Secrets + Randomness:</h3>
            <p className="break-all text-green-600">{secrets.join(', ')}</p>
          </div>
        )}

        {coefficients.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">Coefficients of the polynomial:</h3>
            <p className="break-all">{coefficients.join(', ')}</p>
          </div>
        )}

        {evaluation.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">Evaluation of the polynomial:</h3>
            <p className="break-all">
              {evaluation.map((value, index) => (
                <span key={index} className={getEvaluationColor(index)}>
                  {value}
                  {index < evaluation.length - 1 ? ', ' : ''}
                </span>
              ))}
            </p>
          </div>
        )}

        {encoding.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">Encoding:</h3>
            <p className="break-all text-blue-600">{encoding.join(', ')}</p>
          </div>
        )}
      </CardContent>
      </Card>
    </TabsContent>

    <TabsContent value="merkle-gpt">
    <Card className="max-w-3xl mx-auto mt-10">
        <CardHeader>
          <CardTitle>Merkle Tree Visualization - ChatGPT</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Leaves (comma-separated):</label>
              <Input
                type="text"
                value={leavesInput}
                onChange={(e) => setLeavesInput(e.target.value)}
                placeholder="e.g., leaf1, leaf2, leaf3"
              />
            </div>
            <Button onClick={handleGenerateTree} className="w-full" disabled={isLoading}>
              {isLoading ? "Generating..." : "Generate Merkle Tree"}
            </Button>
          </div>
          {merkleTree && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold">Merkle Tree:</h3>
              {merkleTree.map((layer, layerIndex) => (
                <div key={layerIndex}>
                  <h4>Layer {layerIndex}:</h4>
                  <div className="flex flex-wrap space-x-2">
                    {layer.map((node, nodeIndex) => (
                      <div
                        key={nodeIndex}
                        className="border rounded-md p-2 cursor-pointer"
                        onClick={() => handleShowDecommitment(nodeIndex)}
                      >
                        {node.substring(0, 8)}...
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {decommitment && selectedLeafIndex !== null && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold">Decommitment Proof for Leaf {selectedLeafIndex}:</h3>
              <ul className="list-disc pl-5">
                {decommitment.map((hash, index) => (
                  <li key={index}>{hash}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
  </TabsContent>
    
 
 
  
        </Tabs>
      
      <footer className="text-center text-sm text-gray-500 mt-6">
        © 2024 Ligero Inc.
      </footer>
    </div>
  );
};

export default ModularApp;
