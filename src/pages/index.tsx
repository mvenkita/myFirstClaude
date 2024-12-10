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
  const [coefficients, setCoefficients] = useState([]);
  const [evaluations, setEvaluations] = useState([]);//<number[] | null>(null);

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
  const [leafInputs, setLeafInputs] = useState({
    leaf1: '', leaf2: '', leaf3: '', leaf4: '', 
    leaf5: '', leaf6: '', leaf7: '', leaf8: ''
  });

  const [nodeHashes, setNodeHashes] = useState({
    node1: '', node2: '', node3: '', node4: '',
    node5: '', node6: '', root: ''
  });

  useEffect(() => {
    const computeHashes = async () => {
      const node1Hash = await computeSHA256(leafInputs.leaf1 + leafInputs.leaf2);
      const node2Hash = await computeSHA256(leafInputs.leaf3 + leafInputs.leaf4);
      const node3Hash = await computeSHA256(leafInputs.leaf5 + leafInputs.leaf6);
      const node4Hash = await computeSHA256(leafInputs.leaf7 + leafInputs.leaf8);

      const node5Hash = await computeSHA256(node1Hash + node2Hash);
      const node6Hash = await computeSHA256(node3Hash + node4Hash);

      const rootHash = await computeSHA256(node5Hash + node6Hash);

      setNodeHashes({
        node1: node1Hash, node2: node2Hash, 
        node3: node3Hash, node4: node4Hash,
        node5: node5Hash, node6: node6Hash, 
        root: rootHash
      });
    };

    computeHashes();
  }, [leafInputs]);

  const handleLeafChange = (leafKey, value) => {
    setLeafInputs(prev => ({...prev, [leafKey]: value}));
  };
  const [length, setLength] = useState<number>(0);
  const [randomArray, setRandomArray] = useState<number[] | null>(null);


  const generateShares = () => {
    const secretNumber = parseInt(secret, 10);
    const pp = parseInt(primeNum, 10);

    if (isNaN(secretNumber) || secretNumber <= 0) {
      alert("Please enter a valid positive number as the secret.");
      return;
    }

    // Generate random coefficients for the polynomial
    const coeffs = [
      secretNumber, // Constant term (secret)
      ...Array(3)
        .fill(0)
        .map(() => Math.floor(Math.random() * 100) % pp), // Random coefficients for degree 3 polynomial
    ];

    setCoefficients(coeffs);

    // Generate 6 shares using Shamir's Secret Sharing
    // const points = shamir.split(generateRandomUint8Array, 6, 3, secretNumber); // 6 shares, 3 required to reconstruct
    const evaluatePolynomial = (coeff: number[], x: number): number => {
    return coeff.reduce((acc, coef, index) => (acc + coef * Math.pow(x, index), 0));
    };
    const results = Array.from({ length: 7 }, (_, x) => evaluatePolynomial(coeffs, x));
    setEvaluations(results);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-center mb-6">Modules</h1>
      
      <Tabs defaultValue="modular-arithmetic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="modular-arithmetic">Modular Arithmetic</TabsTrigger>
          <TabsTrigger value="sha256-hash">SHA256 Hash</TabsTrigger>
          <TabsTrigger value="merkle">Merkle Tree</TabsTrigger>
          <TabsTrigger value="shamir">Secret Sharing</TabsTrigger>
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
              <CardTitle>Merkle Tree</CardTitle>
            </CardHeader>
            <CardContent>
      <div className="flex flex-col items-center space-y-4">
        {/* Root Node */}
        <div className="bg-gray-200 px-2 py-1 rounded text-xs w-48">
          <strong>Root Hash:</strong>
          <p className="break-words">{nodeHashes.root}</p>
        </div>

        {/* Layer 2 Nodes */}
        <div className="flex space-x-8">
          <div className="bg-gray-200 px-2 py-1 rounded text-xs w-36">
            <strong>Node 5 Hash:</strong>
            <p className="break-words">{nodeHashes.node5}</p>
          </div>
          <div className="bg-gray-200 px-2 py-1 rounded text-xs w-36">
            <strong>Node 6 Hash:</strong>
            <p className="break-words">{nodeHashes.node6}</p>
          </div>
        </div>

        {/* Layer 1 Nodes */}
        <div className="flex space-x-4">
          <div className="bg-gray-200 px-2 py-1 rounded text-xs w-24">
            <strong>Node 1 Hash:</strong>
            <p className="break-words">{nodeHashes.node1}</p>
          </div>
          <div className="bg-gray-200 px-2 py-1 rounded text-xs w-24">
            <strong>Node 2 Hash:</strong>
            <p className="break-words">{nodeHashes.node2}</p>
          </div>
          <div className="bg-gray-200 px-2 py-1 rounded text-xs w-24">
            <strong>Node 3 Hash:</strong>
            <p className="break-words">{nodeHashes.node3}</p>
          </div>
          <div className="bg-gray-200 px-2 py-1 rounded text-xs w-24">
            <strong>Node 4 Hash:</strong>
            <p className="break-words">{nodeHashes.node4}</p>
          </div>
        </div>

        {/* Leaf Nodes */}
        <div className="grid grid-cols-8 gap-2">
          {['leaf1', 'leaf2', 'leaf3', 'leaf4', 'leaf5', 'leaf6', 'leaf7', 'leaf8'].map((leafKey) => (
            <input
              key={leafKey}
              type="text"
              placeholder={`Leaf ${leafKey.slice(-1)}`}
              value={leafInputs[leafKey]}
              onChange={(e) => handleLeafChange(leafKey, e.target.value)}
              className="border p-1 text-xs"
            />
          ))}
        </div>
      </div>

            </CardContent>
          </Card>
        </TabsContent>

          <TabsContent value="shamir">
      <Card className="max-w-md mx-auto mt-10">
      <CardHeader>
        <CardTitle>Shamir's Secret Sharing</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <label className="block text-sm font-medium mb-1">Enter Secret (Number):</label>
          <Input
            type="number"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Enter a secret number"
          />
        </div>
      </CardContent>
      <CardContent>
        <div className="space-y-4">
          <label className="block text-sm font-medium mb-1">Enter Prime (Number):</label>
          <Input
            type="number"
            value={primeNum}
            onChange={(e) => setPrimeNum(e.target.value)}
            placeholder="Enter a prime number"
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={generateShares} className="w-full">
          Generate Shares
        </Button>
      </CardFooter>
        <CardContent>
          <h3 className="text-lg font-semibold">Polynomial Coefficients:</h3>
          <ul className="list-disc pl-5">
            {coefficients.map((coef, idx) => (
              <li key={idx}>
                Coefficient of x^{idx}: {coef}
              </li>
            ))}
          </ul>
          <h3 className="text-lg font-semibold mt-4">Shares:</h3>
          <ul className="list-disc pl-5">
            {evaluations.map((share, idx) => (
              <li key={idx}>
                Server {idx + 1}'s share is {share}. This is p({idx}).
              </li>
            ))}
          </ul>
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
